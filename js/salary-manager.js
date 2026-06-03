/**
 * Salary Manager - Logique métier pour la gestion des salaires d'infirmier
 * Gère les calculs, les prévisions et l'affichage des données
 */

class SalaryManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.currentDate = new Date();
        this.currentViewMonth = this.currentDate.getMonth();
        this.currentViewYear = this.currentDate.getFullYear();
        
        // Année sélectionnée pour le récapitulatif annuel
        this.selectedYearlyYear = this.currentDate.getFullYear();
    }

    /**
     * CALCULS DE SALAIRES
     */

    /**
     * Calcule le tarif horaire d'un type de mission
     * Utilise le hourlyRate stocké si disponible, sinon calcule depuis salary
     */
    calculateHourlyRate(rate) {
        if (!rate || rate.hours === 0) return 0; // Indemnités = pas de tarif horaire
        
        // Utiliser le tarif horaire stocké si disponible
        if (rate.hourlyRate && rate.hourlyRate > 0) {
            return Math.round(rate.hourlyRate * 1000) / 1000; // Arrondir à 3 décimales
        }
        
        // Sinon calculer depuis le salaire
        if (rate.salary && rate.hours > 0) {
            return Math.round((rate.salary / rate.hours) * 1000) / 1000;
        }
        
        return 0;
    }

    /**
     * Calcule le salaire total pour une liste de missions
     */
    calculateTotalSalary(missions) {
        const rates = this.dataManager.getRates();
        let total = 0;

        missions.forEach(mission => {
            if (mission.status !== 'cancelled') {
                const rate = rates.find(r => r.id === mission.rateId);
                if (rate) {
                    // Utiliser le salaire stocké en priorité
                    if (rate.salary && rate.salary > 0) {
                        total += rate.salary;
                    } else if (rate.hourlyRate && rate.hours > 0) {
                        // Sinon calculer depuis le tarif horaire
                        total += rate.hourlyRate * rate.hours;
                    }
                }
            }
        });

        return Math.round(total * 100) / 100;
    }

    /**
     * Calcule le nombre total d'heures pour une liste de missions
     */
    calculateTotalHours(missions) {
        const rates = this.dataManager.getRates();
        let totalHours = 0;

        missions.forEach(mission => {
            if (mission.status !== 'cancelled') {
                const rate = rates.find(r => r.id === mission.rateId);
                // Ne compter que les missions avec des heures (pas les indemnités)
                // ET qui ne sont pas exclues du comptage
                if (rate && rate.hours > 0 && !rate.excludeFromCount) {
                    totalHours += rate.hours;
                }
            }
        });

        return Math.round(totalHours * 100) / 100;
    }

    /**
     * GESTION DU CALENDRIER
     */

    /**
     * Génère les données du calendrier pour un mois donné
     */
    generateCalendarData(year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        const endDate = new Date(lastDay);

        // Ajuster pour commencer le lundi
        const startDayOfWeek = firstDay.getDay();
        const mondayOffset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
        startDate.setDate(firstDay.getDate() - mondayOffset);

        // Ajuster pour finir le dimanche
        const endDayOfWeek = lastDay.getDay();
        const sundayOffset = endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek;
        endDate.setDate(lastDay.getDate() + sundayOffset);

        const calendarDays = [];
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const isCurrentMonth = currentDate.getMonth() === month;
            const isToday = this.isSameDay(currentDate, new Date());
            
            // Formater la date au format YYYY-MM-DD pour éviter les problèmes de timezone
            const dateStr = currentDate.getFullYear() + '-' + 
                           String(currentDate.getMonth() + 1).padStart(2, '0') + '-' + 
                           String(currentDate.getDate()).padStart(2, '0');
            
            const missions = this.dataManager.getMissionsByDate(dateStr);

            calendarDays.push({
                date: new Date(currentDate),
                dayNumber: currentDate.getDate(),
                isCurrentMonth,
                isToday,
                missions,
                hasMission: missions.length > 0
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return calendarDays;
    }

    /**
     * Vérifie si deux dates sont le même jour
     */
    isSameDay(date1, date2) {
        return date1.toDateString() === date2.toDateString();
    }

    /**
     * Formate une date en français
     */
    formatDate(date, options = {}) {
        const defaultOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };

        return new Intl.DateTimeFormat('fr-FR', { ...defaultOptions, ...options }).format(date);
    }

    /**
     * Formate seulement le nom du mois
     */
    formatMonthName(date) {
        return new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(date);
    }

    /**
     * Formate un nombre en euros
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 3
        }).format(amount);
    }

    /**
     * Retourne le label du statut d'une mission
     */
    getStatusLabel(status) {
        const labels = {
            planned: 'Planifiée',
            confirmed: 'Confirmée',
            completed: 'Réalisée',
            cancelled: 'Annulée'
        };
        return labels[status] || status;
    }

    /**
     * STATISTIQUES ET PRÉVISIONS
     */

    /**
     * Calcule les statistiques pour le mois en cours
     */
    getCurrentMonthStats() {
        return this.dataManager.getMonthlyStats(this.currentDate.getFullYear(), this.currentDate.getMonth());
    }

    /**
     * Calcule les statistiques pour le mois de vue actuel du planning
     */
    getViewMonthStats() {
        return this.dataManager.getMonthlyStats(this.currentViewYear, this.currentViewMonth);
    }

    /**
     * Récupère les prochaines missions (7 jours)
     */
    getUpcomingMissions(daysAhead = 7) {
        const missions = this.dataManager.getMissions();
        const rates = this.dataManager.getRates();
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + daysAhead);
        
        // Formater les dates au format YYYY-MM-DD pour comparaison
        const todayStr = today.getFullYear() + '-' + 
                        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(today.getDate()).padStart(2, '0');
        
        const futureDateStr = futureDate.getFullYear() + '-' + 
                             String(futureDate.getMonth() + 1).padStart(2, '0') + '-' + 
                             String(futureDate.getDate()).padStart(2, '0');

        return missions
            .filter(mission => {
                const missionDateStr = mission.date.split('T')[0]; // Enlever la partie heure si elle existe
                return missionDateStr >= todayStr && 
                       missionDateStr <= futureDateStr && 
                       mission.status !== 'cancelled';
            })
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(mission => {
                const rate = rates.find(r => r.id === mission.rateId);
                const missionDate = new Date(mission.date + 'T00:00:00'); // Forcer l'heure locale
                
                return {
                    ...mission,
                    rate: rate,
                    formattedDate: this.formatDate(missionDate, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                    })
                };
            });
    }

    /**
     * NAVIGATION DU CALENDRIER
     */

    /**
     * Navigue vers le mois précédent
     */
    goToPreviousMonth() {
        if (this.currentViewMonth === 0) {
            this.currentViewMonth = 11;
            this.currentViewYear--;
        } else {
            this.currentViewMonth--;
        }
        return this.getCurrentViewInfo();
    }

    /**
     * Navigue vers le mois suivant
     */
    goToNextMonth() {
        if (this.currentViewMonth === 11) {
            this.currentViewMonth = 0;
            this.currentViewYear++;
        } else {
            this.currentViewMonth++;
        }
        return this.getCurrentViewInfo();
    }

    /**
     * Navigue vers un mois spécifique
     */
    goToMonth(year, month) {
        this.currentViewYear = year;
        this.currentViewMonth = month;
        return this.getCurrentViewInfo();
    }

    /**
     * Revient au mois actuel
     */
    goToCurrentMonth() {
        this.currentViewYear = this.currentDate.getFullYear();
        this.currentViewMonth = this.currentDate.getMonth();
        return this.getCurrentViewInfo();
    }

    /**
     * Récupère les informations du mois de vue actuel
     */
    getCurrentViewInfo() {
        const viewDate = new Date(this.currentViewYear, this.currentViewMonth, 1);
        return {
            year: this.currentViewYear,
            month: this.currentViewMonth,
            monthName: this.formatMonthName(viewDate) + ' ' + this.currentViewYear,
            isCurrentMonth: this.currentViewYear === this.currentDate.getFullYear() && 
                           this.currentViewMonth === this.currentDate.getMonth()
        };
    }

    /**
     * VALIDATION ET GESTION DES ERREURS
     */

    /**
     * Valide qu'une mission peut être ajoutée à une date donnée
     */
    validateMissionDate(date, excludeMissionId = null) {
        const existingMissions = this.dataManager.getMissionsByDate(date);
        
        // Filtrer la mission en cours d'édition si elle existe
        const relevantMissions = excludeMissionId 
            ? existingMissions.filter(m => m.id !== excludeMissionId)
            : existingMissions;

        const warnings = [];
        
        // Vérifier les conflits horaires (plus de 2 missions par jour)
        if (relevantMissions.length >= 2) {
            warnings.push('Attention: Vous avez déjà plusieurs missions ce jour-là');
        }

        // Vérifier si c'est un jour passé
        const missionDate = new Date(date + 'T00:00:00'); // Forcer l'heure locale
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (missionDate < today) {
            warnings.push('Cette date est dans le passé');
        }

        // Vérifier si c'est très loin dans le futur (plus de 6 mois)
        const sixMonthsLater = new Date();
        sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
        
        if (missionDate > sixMonthsLater) {
            warnings.push('Cette mission est planifiée très loin dans le futur');
        }

        return {
            isValid: true, // On autorise toujours, mais on prévient
            warnings: warnings,
            existingMissions: relevantMissions
        };
    }

    /**
     * Calcule les statistiques annuelles par établissement
     * @param {number} year - Année à analyser (optionnel, par défaut l'année sélectionnée)
     */
    getYearlyStatsByEstablishment(year = null) {
        const targetYear = year || this.selectedYearlyYear;
        const missions = this.dataManager.getMissions();
        const rates = this.dataManager.getRates();
        
        // Filtrer les missions de l'année cible
        const yearMissions = missions.filter(mission => {
            const missionYear = new Date(mission.date).getFullYear();
            return missionYear === targetYear && mission.status !== 'cancelled';
        });
        
        // Grouper par établissement
        const statsByEstablishment = {};
        let globalStats = {
            missions: 0,
            hours: 0,
            grossSalary: 0,
            netSalary: 0
        };
        
        yearMissions.forEach(mission => {
            const rate = rates.find(r => r.id === mission.rateId);
            if (!rate) return;
            
            // Déterminer l'établissement
            const establishment = mission.establishment || rate.establishment || 'Non spécifié';
            
            // Initialiser l'établissement si nécessaire
            if (!statsByEstablishment[establishment]) {
                statsByEstablishment[establishment] = {
                    name: establishment,
                    missions: 0,
                    hours: 0,
                    grossSalary: 0,
                    netSalary: 0
                };
            }
            
            // Incrémenter le nombre de missions
            statsByEstablishment[establishment].missions++;
            globalStats.missions++;
            
            // Ajouter les heures (seulement si pas exclu du comptage et pas une indemnité)
            if (!rate.excludeFromCount && rate.hours > 0) {
                statsByEstablishment[establishment].hours += rate.hours;
                globalStats.hours += rate.hours;
            }
            
            // Ajouter les salaires réels si disponibles
            if (mission.realGrossSalary) {
                statsByEstablishment[establishment].grossSalary += mission.realGrossSalary;
                globalStats.grossSalary += mission.realGrossSalary;
            }
            
            if (mission.realNetSalary) {
                statsByEstablishment[establishment].netSalary += mission.realNetSalary;
                globalStats.netSalary += mission.realNetSalary;
            }
        });
        
        // Calculer le tarif horaire moyen pour chaque établissement
        // Tarif horaire = Net réel total / Heures totales travaillées
        const establishmentArray = Object.values(statsByEstablishment).map(stats => {
            // Le tarif horaire moyen est calculé sur TOUTES les heures travaillées
            // (pas seulement celles avec un salaire réel)
            const avgHourlyRate = stats.hours > 0 ? stats.netSalary / stats.hours : 0;
            
            return {
                ...stats,
                avgHourlyRate: Math.round(avgHourlyRate * 100) / 100,
                formattedGross: this.formatCurrency(stats.grossSalary),
                formattedNet: this.formatCurrency(stats.netSalary),
                formattedHourly: this.formatCurrency(avgHourlyRate)
            };
        });
        
        // Trier par nombre de missions décroissant
        establishmentArray.sort((a, b) => b.missions - a.missions);
        
        // Calculer le tarif horaire moyen global
        // Net réel total / Toutes les heures travaillées
        const globalAvgHourlyRate = globalStats.hours > 0 ? globalStats.netSalary / globalStats.hours : 0;
        
        return {
            year: targetYear,
            establishments: establishmentArray,
            totals: {
                missions: globalStats.missions,
                hours: Math.round(globalStats.hours * 100) / 100,
                grossSalary: Math.round(globalStats.grossSalary * 100) / 100,
                netSalary: Math.round(globalStats.netSalary * 100) / 100,
                avgHourlyRate: Math.round(globalAvgHourlyRate * 100) / 100,
                formattedGross: this.formatCurrency(globalStats.grossSalary),
                formattedNet: this.formatCurrency(globalStats.netSalary),
                formattedHourly: this.formatCurrency(globalAvgHourlyRate)
            }
        };
    }

    /**
     * Calcule les statistiques mensuelles par établissement
     * @param {number} year - Année (optionnel)
     * @param {number} month - Mois (optionnel)
     */
    getMonthlyStatsByEstablishment(year = null, month = null) {
        const targetYear = year || this.currentViewYear;
        const targetMonth = month !== null ? month : this.currentViewMonth;
        
        const missions = this.dataManager.getMissions();
        const rates = this.dataManager.getRates();
        
        // Filtrer les missions du mois cible
        const monthMissions = missions.filter(mission => {
            const missionDate = new Date(mission.date);
            return missionDate.getFullYear() === targetYear && 
                   missionDate.getMonth() === targetMonth && 
                   mission.status !== 'cancelled';
        });
        
        // Grouper par établissement
        const statsByEstablishment = {};
        let globalStats = {
            missions: 0,
            hours: 0,
            estimatedSalary: 0,
            grossSalary: 0,
            netSalary: 0
        };
        
        monthMissions.forEach(mission => {
            const rate = rates.find(r => r.id === mission.rateId);
            if (!rate) return;
            
            // Déterminer l'établissement
            const establishment = mission.establishment || rate.establishment || 'Non spécifié';
            
            // Initialiser l'établissement si nécessaire
            if (!statsByEstablishment[establishment]) {
                statsByEstablishment[establishment] = {
                    name: establishment,
                    missions: 0,
                    hours: 0,
                    estimatedSalary: 0,
                    grossSalary: 0,
                    netSalary: 0
                };
            }
            
            // Incrémenter le nombre de missions
            statsByEstablishment[establishment].missions++;
            globalStats.missions++;
            
            // Ajouter les heures (seulement si pas exclu du comptage et pas une indemnité)
            if (!rate.excludeFromCount && rate.hours > 0) {
                statsByEstablishment[establishment].hours += rate.hours;
                globalStats.hours += rate.hours;
            }
            
            // Ajouter le salaire estimé
            let estimatedAmount = 0;
            if (rate.salary) {
                estimatedAmount = rate.salary;
            } else if (rate.hourlyRate && rate.hours) {
                estimatedAmount = rate.hourlyRate * rate.hours;
            }
            statsByEstablishment[establishment].estimatedSalary += estimatedAmount;
            globalStats.estimatedSalary += estimatedAmount;
            
            // Ajouter les salaires réels si disponibles
            if (mission.realGrossSalary) {
                statsByEstablishment[establishment].grossSalary += mission.realGrossSalary;
                globalStats.grossSalary += mission.realGrossSalary;
            }
            
            if (mission.realNetSalary) {
                statsByEstablishment[establishment].netSalary += mission.realNetSalary;
                globalStats.netSalary += mission.realNetSalary;
            }
        });
        
        // Calculer les statistiques pour chaque établissement
        const establishmentArray = Object.values(statsByEstablishment).map(stats => {
            // Tarif horaire moyen net réel
            const avgHourlyRate = stats.hours > 0 ? stats.netSalary / stats.hours : 0;
            
            // Écart (net réel - net estimé)
            const difference = stats.netSalary - stats.estimatedSalary;
            
            return {
                ...stats,
                avgHourlyRate: Math.round(avgHourlyRate * 100) / 100,
                difference: Math.round(difference * 100) / 100,
                formattedEstimated: this.formatCurrency(stats.estimatedSalary),
                formattedGross: this.formatCurrency(stats.grossSalary),
                formattedNet: this.formatCurrency(stats.netSalary),
                formattedHourly: this.formatCurrency(avgHourlyRate),
                formattedDifference: this.formatCurrency(difference),
                differenceClass: difference >= 0 ? 'positive' : 'negative'
            };
        });
        
        // Trier par nombre de missions décroissant
        establishmentArray.sort((a, b) => b.missions - a.missions);
        
        // Calculer les totaux
        const globalAvgHourlyRate = globalStats.hours > 0 ? globalStats.netSalary / globalStats.hours : 0;
        const globalDifference = globalStats.netSalary - globalStats.estimatedSalary;
        
        return {
            year: targetYear,
            month: targetMonth,
            monthName: this.formatMonthName(new Date(targetYear, targetMonth, 1)) + ' ' + targetYear,
            establishments: establishmentArray,
            totals: {
                missions: globalStats.missions,
                hours: Math.round(globalStats.hours * 100) / 100,
                estimatedSalary: Math.round(globalStats.estimatedSalary * 100) / 100,
                grossSalary: Math.round(globalStats.grossSalary * 100) / 100,
                netSalary: Math.round(globalStats.netSalary * 100) / 100,
                avgHourlyRate: Math.round(globalAvgHourlyRate * 100) / 100,
                difference: Math.round(globalDifference * 100) / 100,
                formattedEstimated: this.formatCurrency(globalStats.estimatedSalary),
                formattedGross: this.formatCurrency(globalStats.grossSalary),
                formattedNet: this.formatCurrency(globalStats.netSalary),
                formattedHourly: this.formatCurrency(globalAvgHourlyRate),
                formattedDifference: this.formatCurrency(globalDifference),
                differenceClass: globalDifference >= 0 ? 'positive' : 'negative'
            }
        };
    }

    /**
     * Navigation pour le récapitulatif annuel
     */
    goToPreviousYear() {
        // Trouver la première année avec des missions
        const missions = this.dataManager.getMissions();
        
        if (missions.length === 0) {
            return this.selectedYearlyYear; // Pas de missions, pas de navigation
        }
        
        let minYear = new Date().getFullYear();
        
        missions.forEach(mission => {
            const missionYear = new Date(mission.date).getFullYear();
            if (missionYear < minYear) {
                minYear = missionYear;
            }
        });
        
        // Ne pas descendre en dessous de la première année avec des missions
        if (this.selectedYearlyYear > minYear) {
            this.selectedYearlyYear--;
        }
        return this.selectedYearlyYear;
    }
    
    goToNextYear() {
        const currentYear = new Date().getFullYear();
        // Ne pas dépasser l'année en cours
        if (this.selectedYearlyYear < currentYear) {
            this.selectedYearlyYear++;
        }
        return this.selectedYearlyYear;
    }
    
    setYearlyYear(year) {
        this.selectedYearlyYear = year;
        return this.selectedYearlyYear;
    }

    /**
     * EXPORT ET RAPPORTS
     */

    /**
     * ANCIENNE VERSION - OBSOLÈTE
     * Utiliser la nouvelle version plus bas dans le fichier
     */
    generateICSFile_OLD(year = null, month = null, includeAllMissions = false) {
        let missions;
        
        // Si année et mois spécifiés, filtrer
        if (year !== null && month !== null) {
            missions = this.dataManager.getMissionsByMonth(year, month);
        } else {
            // Sinon, toutes les missions
            missions = this.dataManager.getMissions();
        }
        
        // NOUVEAU : Filtrer pour ne garder que les missions futures (sauf si includeAllMissions est true)
        if (!includeAllMissions) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Minuit aujourd'hui pour inclure les missions d'aujourd'hui
            const todayStr = today.getFullYear() + '-' + 
                           String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                           String(today.getDate()).padStart(2, '0');
            
            // Filtrer pour ne garder que les missions à partir d'aujourd'hui
            const totalMissions = missions.length;
            missions = missions.filter(mission => {
                const missionDateStr = mission.date.split('T')[0]; // YYYY-MM-DD
                return missionDateStr >= todayStr;
            });
            
            console.log(`Export ICS: ${missions.length} missions futures sur ${totalMissions} missions totales`);
        }
        
        const rates = this.dataManager.getRates();
        
        // En-tête ICS
        let icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Suivi Salaires Infirmier//FR',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:Missions Infirmier',
            'X-WR-TIMEZONE:Europe/Paris',
            'X-WR-CALDESC:Planning des missions infirmières',
            ''  // Ligne vide après l'en-tête
        ].join('\r\n');
        
        // Compteur de missions exportées
        let exportedCount = 0;
        
        // Ajouter chaque mission comme événement
        const events = [];
        missions.forEach(mission => {
            // Ignorer les missions annulées
            if (mission.status === 'cancelled') return;
            
            const rate = rates.find(r => r.id === mission.rateId);
            if (!rate) return;
            
            // Date de la mission
            const missionDate = mission.date.split('T')[0]; // YYYY-MM-DD
            const [year, month, day] = missionDate.split('-');
            
            // Horaires de début et fin
            let startTime = mission.startTime || rate.startTime || '08:00';
            let endTime = mission.endTime || rate.endTime || '20:00';
            
            // Pour les indemnités (0h), événement d'une heure
            if (rate.hours === 0) {
                startTime = '00:00';
                endTime = '00:00';
            }
            
            // Format ICS pour les dates : YYYYMMDDTHHMMSS
            const [startHour, startMin] = startTime.split(':');
            const [endHour, endMin] = endTime.split(':');
            
            const dtStart = `${year}${month}${day}T${startHour}${startMin}00`;
            const dtEnd = `${year}${month}${day}T${endHour}${endMin}00`;
            
            // Pour les indemnités, utiliser DATE au lieu de DATETIME
            const dateFormat = rate.hours === 0 ? 'DATE' : 'DATETIME';
            const dtStartFormatted = rate.hours === 0 ? `${year}${month}${day}` : dtStart;
            const dtEndFormatted = rate.hours === 0 ? `${year}${month}${day}` : dtEnd;
            
            // ID unique pour l'événement
            const uid = `mission-${mission.id}@nurse-salary-tracker`;
            
            // Timestamp de création
            const now = new Date();
            const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            
            // Titre de l'événement avec emoji selon le statut
            let statusEmoji = '';
            switch(mission.status) {
                case 'confirmed':
                    statusEmoji = '✅ ';  // Check vert pour confirmée
                    break;
                case 'planned':
                    statusEmoji = '❓ ';   // Point d'interrogation pour planifiée
                    break;
                case 'completed':
                    statusEmoji = '✔️ ';  // Check simple pour réalisée
                    break;
                default:
                    statusEmoji = '';
            }
            const summary = statusEmoji + rate.acronym;
            
            // Lieu
            const location = mission.establishment || rate.establishment || '';
            
            // Description
            let description = [];
            if (mission.service) description.push(`Service: ${mission.service}`);
            if (rate.description) description.push(rate.description);
            if (rate.hours > 0) description.push(`Durée: ${rate.hours}h`);
            if (mission.notes) description.push(`Notes: ${mission.notes}`);
            
            // Statut
            const status = mission.status === 'confirmed' ? 'CONFIRMED' : 
                          mission.status === 'completed' ? 'CONFIRMED' : 
                          'TENTATIVE';
            
            // Catégories et couleurs (support limité selon les calendriers)
            let categories = rate.acronym;
            let color = '';
            
            if (mission.status === 'confirmed') {
                categories += ',Confirmé';
                color = '#00A36C';  // Vert pour confirmé
            } else if (mission.status === 'planned') {
                categories += ',Planifié';
                color = '#FF8C00';  // Orange pour planifié
            } else if (mission.status === 'completed') {
                categories += ',Réalisé';
                color = '#4169E1';  // Bleu pour réalisé
            }
            
            // Construire l'événement
            const eventLines = [
                'BEGIN:VEVENT',
                `UID:${uid}`,
                `DTSTAMP:${timestamp}`,
                dateFormat === 'DATE' ? `DTSTART;VALUE=DATE:${dtStartFormatted}` : `DTSTART:${dtStartFormatted}`,
                dateFormat === 'DATE' ? `DTEND;VALUE=DATE:${dtEndFormatted}` : `DTEND:${dtEndFormatted}`,
                `SUMMARY:${this.escapeICS(summary)}`,
                location ? `LOCATION:${this.escapeICS(location)}` : '',
                description.length > 0 ? `DESCRIPTION:${this.escapeICS(description.join(' - '))}` : '',
                `STATUS:${status}`,
                `CATEGORIES:${categories}`,
                color ? `COLOR:${color}` : '',  // Propriété non-standard pour certains calendriers
                color ? `X-APPLE-CALENDAR-COLOR:${color}` : '',  // Pour Apple Calendar
                color ? `X-MICROSOFT-CDO-COLOR:${color}` : '',  // Pour Outlook
                'TRANSP:OPAQUE',
                'END:VEVENT'
            ].filter(line => line !== '').join('\r\n');
            
            events.push(eventLines);
            exportedCount++;
        });
        
        // Joindre tous les événements avec une ligne vide entre chacun
        if (events.length > 0) {
            icsContent += '\r\n' + events.join('\r\n\r\n');
        }
        
        // Fermer le calendrier avec une ligne vide avant
        icsContent += '\r\n\r\nEND:VCALENDAR';
        
        // Retourner le contenu ICS et le nombre de missions exportées
        return {
            content: icsContent,
            exportedCount: exportedCount,
            totalCount: missions.length
        };
    }
    
    /**
     * Détermine l'heure de début par défaut selon le type de mission
     */
    getDefaultStartTime(rate) {
        // Si c'est une indemnité (0h), pas d'horaire
        if (rate.hours === 0) return '00:00';
        
        // Horaires typiques selon la durée
        if (rate.hours <= 7) return '08:00';  // Missions courtes du matin
        if (rate.hours <= 10) return '08:00'; // Journée standard
        if (rate.hours >= 12) return '07:30'; // Missions longues (12h)
        return '08:00'; // Défaut
    }
    
    /**
     * Détermine l'heure de fin par défaut basée sur l'heure de début et la durée
     */
    getDefaultEndTime(rate, startTimeStr) {
        // Si c'est une indemnité (0h), même heure que le début
        if (rate.hours === 0) return '00:00';
        
        const [startH, startM] = startTimeStr.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = startMinutes + (rate.hours * 60);
        
        const endH = Math.floor(endMinutes / 60) % 24; // Modulo 24 pour gérer les dépassements
        const endM = endMinutes % 60;
        
        return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    }
    
    /**
     * Échappe les caractères spéciaux pour le format ICS
     */
    escapeICS(text) {
        if (!text) return '';
        return text
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '');
    }

    /**
     * Génère un rapport mensuel
     */
    generateMonthlyReport(year, month) {
        const missions = this.dataManager.getMissionsByMonth(year, month);
        const rates = this.dataManager.getRates();
        const stats = this.dataManager.getMonthlyStats(year, month);

        // Grouper les missions par établissement
        const missionsByEstablishment = {};
        const missionsByStatus = {
            planned: [],
            confirmed: [],
            completed: [],
            cancelled: []
        };

        missions.forEach(mission => {
            const rate = rates.find(r => r.id === mission.rateId);
            const missionWithRate = { ...mission, rate };

            // Par établissement
            const establishment = mission.establishment || 'Non spécifié';
            if (!missionsByEstablishment[establishment]) {
                missionsByEstablishment[establishment] = [];
            }
            missionsByEstablishment[establishment].push(missionWithRate);

            // Par statut
            if (missionsByStatus[mission.status]) {
                missionsByStatus[mission.status].push(missionWithRate);
            }
        });

        return {
            period: this.formatDate(new Date(year, month, 1), { year: 'numeric', month: 'long' }),
            stats: stats,
            missions: missions.map(mission => {
                const rate = rates.find(r => r.id === mission.rateId);
                return { ...mission, rate };
            }),
            missionsByEstablishment,
            missionsByStatus,
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Exporte un rapport au format CSV
     */
    exportToCSV(year, month) {
        const report = this.generateMonthlyReport(year, month);
        
        const headers = [
            'Date',
            'Type de mission',
            'Établissement',
            'Service',
            'Heures',
            'Salaire',
            'Tarif horaire',
            'Statut',
            'Notes'
        ];

        const rows = report.missions.map(mission => [
            new Date(mission.date).toLocaleDateString('fr-FR'),
            mission.rate ? mission.rate.acronym : 'Inconnu',
            mission.establishment || '',
            mission.service || '',
            mission.rate ? mission.rate.hours : 0,
            mission.rate ? mission.rate.salary : 0,
            mission.rate ? this.calculateHourlyRate(mission.rate) : 0,
            this.getStatusLabel(mission.status),
            mission.notes || ''
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        return csvContent;
    }

    /**
     * Récupère le libellé d'un statut
     */
    getStatusLabel(status) {
        const labels = {
            planned: 'Planifiée',
            confirmed: 'Confirmée',
            completed: 'Réalisée',
            cancelled: 'Annulée'
        };
        return labels[status] || status;
    }

    /**
     * UTILITAIRES POUR L'INTERFACE
     */

    /**
     * Prépare les données pour l'affichage du tableau de bord
     */
    getDashboardData() {
        const upcomingMissions = this.getUpcomingMissions();
        const yearlyStats = this.getYearlyStatsByEstablishment();
        
        return {
            upcomingMissions: upcomingMissions,
            yearlyStats: yearlyStats
        };
    }

    /**
     * Prépare les données pour l'affichage de la table des tarifs
     */
    getRatesTableData() {
        const rates = this.dataManager.getRates();
        return rates.map(rate => {
            const calculatedHourlyRate = this.calculateHourlyRate(rate);
            
            // Utiliser le salaire stocké en priorité, sinon calculer
            let displaySalary = rate.salary;
            if (!displaySalary && rate.hourlyRate && rate.hours > 0) {
                displaySalary = rate.hourlyRate * rate.hours;
            }
            
            return {
                ...rate,
                hourlyRate: rate.hourlyRate || calculatedHourlyRate,
                salary: displaySalary,
                formattedSalary: this.formatCurrency(displaySalary || 0),
                formattedHourlyRate: this.formatCurrency(calculatedHourlyRate)
            };
        });
    }

    /**
     * Prépare les données pour l'affichage du planning
     */
    getPlanningData() {
        const calendarData = this.generateCalendarData(this.currentViewYear, this.currentViewMonth);
        const monthStats = this.getViewMonthStats();
        const viewInfo = this.getCurrentViewInfo();

        return {
            calendarData,
            monthStats: {
                totalMissions: monthStats.missionCount,
                totalHours: `${monthStats.totalHours}h`,
                totalEstimatedSalary: this.formatCurrency(monthStats.totalEstimatedSalary),
                totalRealSalary: this.formatCurrency(monthStats.totalRealNetSalary),
                salaryDifference: this.formatCurrency(monthStats.salaryDifference),
                salaryDifferenceClass: monthStats.salaryDifference >= 0 ? 'positive' : 'negative'
            },
            viewInfo
        };
    }

    /**
     * Recherche dans les tarifs
     */
    searchRates(searchTerm) {
        const rates = this.dataManager.getRates();
        const term = searchTerm.toLowerCase();
        
        return rates.filter(rate => 
            rate.acronym.toLowerCase().includes(term) ||
            (rate.description && rate.description.toLowerCase().includes(term))
        );
    }

    /**
     * Prépare les données pour le planning
     */
    getPlanningData() {
        const calendarData = this.generateCalendarData(this.currentViewYear, this.currentViewMonth);
        const monthStats = this.getViewMonthStats();
        const viewInfo = this.getCurrentViewInfo();
        const monthlyEstablishmentStats = this.getMonthlyStatsByEstablishment();

        return {
            calendarData,
            monthStats: {
                totalMissions: monthStats.missionCount,
                totalHours: `${monthStats.totalHours}h`,
                totalEstimatedSalary: this.formatCurrency(monthStats.totalEstimatedSalary),
                totalRealSalary: this.formatCurrency(monthStats.totalRealNetSalary),
                salaryDifference: this.formatCurrency(monthStats.salaryDifference),
                salaryDifferenceClass: monthStats.salaryDifference >= 0 ? 'positive' : 'negative'
            },
            viewInfo,
            monthlyEstablishmentStats
        };
    }

    /**
     * Recherche dans les missions
     */
    searchMissions(searchTerm, filters = {}) {
        const missions = this.dataManager.getMissions();
        const rates = this.dataManager.getRates();
        const term = searchTerm.toLowerCase();
        
        let filteredMissions = missions.filter(mission => {
            const rate = rates.find(r => r.id === mission.rateId);
            const searchFields = [
                mission.establishment,
                mission.service,
                mission.notes,
                rate ? rate.acronym : '',
                rate ? rate.description : ''
            ].filter(Boolean).join(' ').toLowerCase();
            
            return searchFields.includes(term);
        });

        // Appliquer les filtres additionnels
        if (filters.status) {
            filteredMissions = filteredMissions.filter(m => m.status === filters.status);
        }
        
        if (filters.establishment) {
            filteredMissions = filteredMissions.filter(m => 
                m.establishment && m.establishment.toLowerCase().includes(filters.establishment.toLowerCase())
            );
        }

        if (filters.dateFrom) {
            filteredMissions = filteredMissions.filter(m => 
                new Date(m.date) >= new Date(filters.dateFrom)
            );
        }

        if (filters.dateTo) {
            filteredMissions = filteredMissions.filter(m => 
                new Date(m.date) <= new Date(filters.dateTo)
            );
        }

        return filteredMissions.map(mission => {
            const rate = rates.find(r => r.id === mission.rateId);
            return { ...mission, rate };
        });
    }

    /**
     * Generate ICS file content for calendar export (VERSION CORRECTE)
     * @param {boolean} onlyFuture - If true, only export future missions (default: true)
     * @returns {Object} Object containing ICS content and stats
     */
    generateICSFile(onlyFuture = true) {
        const missions = this.dataManager.getMissions();
        const rates = this.dataManager.getRates();
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day for comparison
        
        // Filter missions based on date.
        // Les missions annulées sont conservées : elles seront exportées comme
        // événements "STATUS:CANCELLED" pour être retirées du calendrier au ré-import.
        const filteredMissions = missions.filter(mission => {
            const missionDate = new Date(mission.date + 'T00:00:00');
            return onlyFuture ? missionDate >= today : true;
        });

        // Sort missions by date
        filteredMissions.sort((a, b) => a.date.localeCompare(b.date));

        // ICS header
        let icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Nurse Salary Tracker//Missions Infirmier//FR',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:Missions Infirmier',
            'X-WR-TIMEZONE:Europe/Paris',
            'X-WR-CALDESC:Planning des missions infirmières',
            ''  // Empty line after header
        ].join('\r\n');

        // Add timezone definition
        icsContent += [
            'BEGIN:VTIMEZONE',
            'TZID:Europe/Paris',
            'X-LIC-LOCATION:Europe/Paris',
            'BEGIN:DAYLIGHT',
            'TZOFFSETFROM:+0100',
            'TZOFFSETTO:+0200',
            'TZNAME:CEST',
            'DTSTART:19700329T020000',
            'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
            'END:DAYLIGHT',
            'BEGIN:STANDARD',
            'TZOFFSETFROM:+0200',
            'TZOFFSETTO:+0100',
            'TZNAME:CET',
            'DTSTART:19701025T030000',
            'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
            'END:STANDARD',
            'END:VTIMEZONE',
            ''
        ].join('\r\n');

        // Generate unique ID for each event
        const generateUID = (mission) => {
            const timestamp = new Date(mission.date).getTime();
            return `${mission.id}-${timestamp}@nurse-salary-tracker`;
        };

        // Add events
        let exportedCount = 0;
        let cancelledCount = 0;
        const events = [];

        filteredMissions.forEach(mission => {
            const rate = rates.find(r => r.id === mission.rateId);
            if (!rate) return;

            // Determine status emoji
            let statusEmoji = '';
            switch (mission.status) {
                case 'confirmed':
                    statusEmoji = '✅ ';
                    break;
                case 'planned':
                    statusEmoji = '❓ ';
                    break;
                case 'completed':
                    statusEmoji = '✔️ ';
                    break;
            }

            // Format date for ICS (YYYYMMDD)
            const missionDate = new Date(mission.date + 'T00:00:00');
            const dateStr = missionDate.getFullYear() +
                           String(missionDate.getMonth() + 1).padStart(2, '0') +
                           String(missionDate.getDate()).padStart(2, '0');

            // Get start and end times from mission or rate, or use defaults
            // Priority: mission.startTime > rate.startTime > default based on hours
            let startTimeStr = mission.startTime || rate.startTime || this.getDefaultStartTime(rate);
            let endTimeStr = mission.endTime || rate.endTime || this.getDefaultEndTime(rate, startTimeStr);
            
            // Format times for ICS (HHMMSS)
            const [startH, startM] = startTimeStr.split(':');
            const startTime = `${startH.padStart(2, '0')}${startM.padStart(2, '0')}00`;
            
            const [endH, endM] = endTimeStr.split(':');
            const endTime = `${endH.padStart(2, '0')}${endM.padStart(2, '0')}00`;

            // Mission annulée : émettre un événement d'annulation (même UID que
            // l'événement déjà exporté) pour qu'un ré-import le supprime du calendrier.
            if (mission.status === 'cancelled') {
                const cancelLines = [
                    'BEGIN:VEVENT',
                    `UID:${generateUID(mission)}`,
                    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
                    `DTSTART;TZID=Europe/Paris:${dateStr}T${startTime}`,
                    `DTEND;TZID=Europe/Paris:${dateStr}T${endTime}`,
                    `SUMMARY:❌ ${rate.acronym} - ${mission.establishment || 'Non spécifié'} (Annulée)`,
                    'SEQUENCE:1',
                    'STATUS:CANCELLED',
                    'TRANSP:TRANSPARENT',
                    'END:VEVENT'
                ].join('\r\n');
                events.push(cancelLines);
                cancelledCount++;
                return;
            }

            exportedCount++;

            // Build event summary
            const summary = `${statusEmoji}${rate.acronym} - ${mission.establishment || 'Non spécifié'}`;

            // Build event description
            let description = [];
            description.push(`Type: ${rate.acronym}`);
            if (rate.description) description.push(`Description: ${rate.description}`);
            if (mission.establishment) description.push(`Établissement: ${mission.establishment}`);
            if (mission.service) description.push(`Service: ${mission.service}`);
            description.push(`Durée: ${rate.hours || 0}h`);
            
            // Add salary info if not excluded from count
            if (!rate.excludeFromCount) {
                if (rate.salary) {
                    description.push(`Salaire: ${rate.salary}€`);
                } else if (rate.hourlyRate) {
                    description.push(`Tarif horaire: ${rate.hourlyRate}€/h`);
                    description.push(`Salaire estimé: ${(rate.hourlyRate * (rate.hours || 0))}€`);
                }
            }
            
            if (mission.notes) description.push(`Notes: ${mission.notes}`);
            description.push(`Statut: ${mission.status === 'confirmed' ? 'Confirmée' : 
                                      mission.status === 'planned' ? 'Planifiée' : 
                                      mission.status === 'completed' ? 'Réalisée' : mission.status}`);

            // Create event
            const eventLines = [
                'BEGIN:VEVENT',
                `UID:${generateUID(mission)}`,
                `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
                `DTSTART;TZID=Europe/Paris:${dateStr}T${startTime}`,
                `DTEND;TZID=Europe/Paris:${dateStr}T${endTime}`,
                `SUMMARY:${summary}`,
                `DESCRIPTION:${description.join('\\n')}`,
                mission.establishment ? `LOCATION:${mission.establishment}` : '',
                `STATUS:${mission.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}`,
                'TRANSP:OPAQUE',
                'END:VEVENT'
            ].filter(line => line).join('\r\n');

            events.push(eventLines);
        });
        
        // Join all events with empty line between each
        if (events.length > 0) {
            icsContent += '\r\n' + events.join('\r\n\r\n');
        }
        
        // Close calendar with empty line before
        icsContent += '\r\n\r\nEND:VCALENDAR';
        
        // Return ICS content and stats
        return {
            content: icsContent,
            exportedCount: exportedCount,
            cancelledCount: cancelledCount,
            totalCount: missions.length,
            skippedPastCount: onlyFuture ? missions.filter(m => {
                const missionDate = new Date(m.date + 'T00:00:00');
                return missionDate < today && m.status !== 'cancelled';
            }).length : 0
        };
    }
}

// Créer une instance globale du gestionnaire de salaires
window.salaryManager = new SalaryManager(window.dataManager);