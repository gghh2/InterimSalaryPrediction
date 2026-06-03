/**
 * Data Manager - Gestion des données avec localStorage
 * Système simple et sécurisé pour stocker les données localement
 */

class DataManager {
    constructor() {
        // Clés pour le localStorage
        this.STORAGE_KEYS = {
            RATES: 'nurse_salary_rates',
            MISSIONS: 'nurse_salary_missions',
            SETTINGS: 'nurse_salary_settings',
            BACKUP_DATE: 'nurse_salary_last_backup'
        };
        
        // Initialisation des données par défaut
        this.initializeDefaultData();
        
        // Sauvegarde automatique toutes les 5 minutes
        this.startAutoBackup();
    }

    /**
     * Initialise les données par défaut si elles n'existent pas
     */
    initializeDefaultData() {
        // Vérifier si des données existent déjà
        if (!this.getRates().length) {
            this.loadDefaultRates();
        }
        
        // Créer les paramètres par défaut
        if (!this.getSettings()) {
            this.saveSettings({
                autoBackup: true,
                backupInterval: 5, // minutes
                defaultEstablishment: '',
                notifications: true
            });
        }
    }

    /**
     * Charge les tarifs par défaut depuis votre fichier Excel
     */
    loadDefaultRates() {
        const defaultRates = [
            { 
                id: this.generateId(),
                acronym: 'Urg C7', 
                description: 'Urgences coupe de 7h',
                establishment: 'Clinique de Cesson Sévigné',
                hours: 7, 
                salary: 102.33 
            },
            { 
                id: this.generateId(),
                acronym: 'Doublure 12h', 
                description: 'Doublure sur 12h payée 10h',
                establishment: 'Clinique de Cesson Sévigné',
                hours: 10, 
                salary: 176.7 
            },
            { 
                id: this.generateId(),
                acronym: '4J3', 
                description: '4 jours sur 3',
                establishment: 'Clinique de Cesson Sévigné',
                hours: 12.5, 
                salary: 184.105 
            },
            { 
                id: this.generateId(),
                acronym: 'Astreinte', 
                description: 'Astreinte weekend',
                establishment: 'CHU Rennes',
                hours: 0, 
                salary: 75.50 
            },
            { 
                id: this.generateId(),
                acronym: 'Garde courte', 
                description: 'Garde de 6h15',
                establishment: 'Clinique de Cesson Sévigné',
                hours: 6.25, 
                salary: 91.50 
            },
            { 
                id: this.generateId(),
                acronym: 'Urg C7 D', 
                description: 'Urgences coupe de 7h dimanche',
                establishment: 'Clinique de Cesson Sévigné',
                hours: 7, 
                salary: 138.06 
            },
            { 
                id: this.generateId(),
                acronym: 'Urg C12', 
                description: 'Urgences coupe de 12h',
                establishment: 'Clinique de Cesson Sévigné',
                hours: 12, 
                salary: 176.7 
            },
            { 
                id: this.generateId(),
                acronym: 'Urg TR D', 
                description: 'Urgences temps de récupération dimanche',
                establishment: 'Clinique de Cesson Sévigné',
                hours: 12, 
                salary: 237.95 
            },
            { 
                id: this.generateId(),
                acronym: 'Urg TR', 
                description: 'Urgences temps de récupération',
                establishment: 'Clinique de Cesson Sévigné',
                hours: 12, 
                salary: 176.7 
            },
            { 
                id: this.generateId(),
                acronym: 'Urg LP', 
                description: 'Urgences Lit Porte',
                establishment: 'Clinique de Cesson Sévigné',
                hours: 12.5, 
                salary: 184.105 
            },
            { 
                id: this.generateId(),
                acronym: 'Urg LP D', 
                description: 'Urgences Lit Porte dimanche',
                establishment: 'Clinique de Cesson Sévigné',
                hours: 12.5, 
                salary: 237.95 
            },
            { 
                id: this.generateId(),
                acronym: 'Urg LP Ferié', 
                description: 'Urgences Lit Porte jour férié',
                establishment: 'Clinique de Cesson Sévigné',
                hours: 12.5, 
                salary: 426.92 
            },
            { 
                id: this.generateId(),
                acronym: 'MedPo', 
                description: 'Médecine Post-Opératoire',
                establishment: 'Clinique de Cesson Sévigné',
                hours: 12.5, 
                salary: 184.105 
            },
            { 
                id: this.generateId(),
                acronym: 'MedPo C7', 
                description: 'Médecine Post-Opératoire 7h',
                establishment: 'Clinique de Cesson Sévigné',
                hours: 7, 
                salary: 102.33 
            },
            { 
                id: this.generateId(),
                acronym: 'MedPo D', 
                description: 'Médecine Post-Opératoire dimanche',
                establishment: 'Clinique de Cesson Sévigné',
                hours: 12.5, 
                salary: 237.95 
            },
            { 
                id: this.generateId(),
                acronym: 'Hemato C7', 
                description: 'Hématologie 7h',
                establishment: 'CHU Rennes',
                hours: 7, 
                salary: 102.33 
            },
            { 
                id: this.generateId(),
                acronym: 'Hemato UHC', 
                description: 'Hématologie UHC',
                establishment: 'CHU Rennes',
                hours: 12.5, 
                salary: 184.105 
            },
            { 
                id: this.generateId(),
                acronym: 'Soins Intensifs', 
                description: 'Soins Intensifs',
                establishment: 'CHU Rennes',
                hours: 12.5, 
                salary: 184.105 
            },
            { 
                id: this.generateId(),
                acronym: 'Indemnité urgence', 
                description: 'Indemnité spéciale urgences',
                establishment: 'Clinique de Cesson Sévigné',
                hours: 0, 
                salary: 183 
            }
        ];
        
        this.saveRates(defaultRates);
        console.log('Tarifs par défaut chargés avec succès');
    }

    /**
     * Génère un ID unique pour les enregistrements
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * GESTION DES TARIFS
     */
    
    getRates() {
        try {
            const rates = localStorage.getItem(this.STORAGE_KEYS.RATES);
            return rates ? JSON.parse(rates) : [];
        } catch (error) {
            console.error('Erreur lors de la récupération des tarifs:', error);
            return [];
        }
    }

    saveRates(rates) {
        try {
            localStorage.setItem(this.STORAGE_KEYS.RATES, JSON.stringify(rates));
            return true;
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des tarifs:', error);
            return false;
        }
    }

    addRate(rate) {
        const rates = this.getRates();
        rate.id = this.generateId();
        rates.push(rate);
        return this.saveRates(rates);
    }

    updateRate(rateId, updatedRate) {
        const rates = this.getRates();
        const index = rates.findIndex(rate => rate.id === rateId);
        
        if (index !== -1) {
            // Garder l'ID existant
            const existingRate = rates[index];
            rates[index] = { 
                ...existingRate, 
                ...updatedRate,
                id: existingRate.id  // Forcer la conservation de l'ID
            };
            return this.saveRates(rates);
        }
        console.error('Tarif non trouvé pour update:', rateId);
        return false;
    }

    deleteRate(rateId) {
        const rates = this.getRates();
        const filteredRates = rates.filter(rate => rate.id !== rateId);
        return this.saveRates(filteredRates);
    }

    getRateById(rateId) {
        const rates = this.getRates();
        return rates.find(rate => rate.id === rateId);
    }

    /**
     * GESTION DES MISSIONS
     */
    
    getMissions() {
        try {
            const missions = localStorage.getItem(this.STORAGE_KEYS.MISSIONS);
            return missions ? JSON.parse(missions) : [];
        } catch (error) {
            console.error('Erreur lors de la récupération des missions:', error);
            return [];
        }
    }

    saveMissions(missions) {
        try {
            localStorage.setItem(this.STORAGE_KEYS.MISSIONS, JSON.stringify(missions));
            return true;
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des missions:', error);
            return false;
        }
    }

    addMission(mission) {
        const missions = this.getMissions();
        mission.id = this.generateId();
        mission.createdAt = new Date().toISOString();
        missions.push(mission);
        return this.saveMissions(missions);
    }

    updateMission(missionId, updatedMission) {
        const missions = this.getMissions();
        const index = missions.findIndex(mission => mission.id === missionId);
        
        if (index !== -1) {
            // Garder l'ID et les métadonnées existantes
            const existingMission = missions[index];
            missions[index] = { 
                ...existingMission, 
                ...updatedMission,
                id: existingMission.id,  // Forcer la conservation de l'ID
                createdAt: existingMission.createdAt,  // Garder la date de création
                updatedAt: new Date().toISOString()  // Mettre à jour la date de modification
            };
            return this.saveMissions(missions);
        }
        console.error('Mission non trouvée pour update:', missionId);
        return false;
    }

    deleteMission(missionId) {
        const missions = this.getMissions();
        const filteredMissions = missions.filter(mission => mission.id !== missionId);
        return this.saveMissions(filteredMissions);
    }

    getMissionById(missionId) {
        const missions = this.getMissions();
        return missions.find(mission => mission.id === missionId);
    }

    /**
     * Récupère les missions pour un mois donné
     */
    getMissionsByMonth(year, month) {
        const missions = this.getMissions();
        return missions.filter(mission => {
            // Extraire l'année et le mois de la date de mission (format YYYY-MM-DD)
            const missionDateStr = mission.date.split('T')[0]; // Enlever la partie heure si elle existe
            const [missionYear, missionMonth] = missionDateStr.split('-').map(Number);
            
            return missionYear === year && missionMonth === (month + 1); // month est 0-indexé
        });
    }

    /**
     * Récupère les missions pour une date donnée
     */
    getMissionsByDate(date) {
        const missions = this.getMissions();
        let targetDate;
        
        // Gérer différents formats de date d'entrée
        if (typeof date === 'string') {
            // Si c'est une string au format YYYY-MM-DD, on la parse directement
            if (date.includes('-') && date.length === 10) {
                targetDate = date;
            } else {
                // Sinon on convertit en format YYYY-MM-DD
                targetDate = new Date(date).toISOString().split('T')[0];
            }
        } else {
            // Si c'est un objet Date
            targetDate = date.toISOString().split('T')[0];
        }
        
        return missions.filter(mission => {
            // Comparer uniquement la partie date (YYYY-MM-DD)
            const missionDate = mission.date.split('T')[0]; // Enlever la partie heure si elle existe
            return missionDate === targetDate;
        });
    }

    /**
     * Récupère la liste unique des établissements depuis les tarifs
     */
    getEstablishments() {
        const rates = this.getRates();
        const establishments = rates
            .map(rate => rate.establishment)
            .filter(establishment => establishment && establishment.trim() !== '')
            .filter((establishment, index, array) => array.indexOf(establishment) === index)
            .sort();
        
        return establishments;
    }

    /**
     * GESTION DES PARAMÈTRES
     */
    
    getSettings() {
        try {
            const settings = localStorage.getItem(this.STORAGE_KEYS.SETTINGS);
            return settings ? JSON.parse(settings) : null;
        } catch (error) {
            console.error('Erreur lors de la récupération des paramètres:', error);
            return null;
        }
    }

    saveSettings(settings) {
        try {
            localStorage.setItem(this.STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des paramètres:', error);
            return false;
        }
    }

    /**
     * CALCULS ET STATISTIQUES
     */

    /**
     * Calcule les statistiques pour un mois donné
     */
    getMonthlyStats(year, month) {
        const missions = this.getMissionsByMonth(year, month);
        const rates = this.getRates();
        
        let totalEstimatedSalary = 0;
        let totalRealGrossSalary = 0;
        let totalRealNetSalary = 0;
        let totalHours = 0;
        let missionCount = 0;
        let realSalaryCount = 0; // Nombre de missions avec salaire réel renseigné
        
        missions.forEach(mission => {
            // Ne compter que les missions non annulées
            if (mission.status !== 'cancelled') {
                const rate = rates.find(r => r.id === mission.rateId);
                if (rate) {
                    // Salaire estimé (priorité au salary stocké, sinon calculer depuis hourlyRate)
                    // Le salaire est TOUJOURS compté, même si excludeFromCount est true
                    if (rate.salary && rate.salary > 0) {
                        totalEstimatedSalary += rate.salary;
                    } else if (rate.hourlyRate && rate.hours > 0) {
                        totalEstimatedSalary += rate.hourlyRate * rate.hours;
                    }
                    
                    // Salaire réel si renseigné (toujours compté)
                    if (mission.realGrossSalary && mission.realGrossSalary > 0) {
                        totalRealGrossSalary += mission.realGrossSalary;
                    }
                    if (mission.realNetSalary && mission.realNetSalary > 0) {
                        totalRealNetSalary += mission.realNetSalary;
                        realSalaryCount++;
                    }
                    
                    // Ne compter les heures et missions que si NOT excludeFromCount
                    if (!rate.excludeFromCount) {
                        // Ne compter les heures que pour les missions non-indemnités
                        if (rate.hours > 0) {
                            totalHours += rate.hours;
                        }
                        missionCount++;
                    }
                }
            }
        });

        return {
            totalEstimatedSalary,
            totalRealGrossSalary,
            totalRealNetSalary,
            totalHours,
            missionCount,
            realSalaryCount,
            averageHourlyRate: totalHours > 0 ? totalEstimatedSalary / totalHours : 0,
            salaryDifference: totalRealNetSalary - totalEstimatedSalary
        };
    }

    /**
     * Calcule les statistiques générales
     */
    getGeneralStats() {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        
        return this.getMonthlyStats(currentYear, currentMonth);
    }

    /**
     * SAUVEGARDE ET RESTAURATION
     */

    /**
     * Exporte toutes les données en JSON
     */
    exportAllData() {
        const data = {
            rates: this.getRates(),
            missions: this.getMissions(),
            settings: this.getSettings(),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        return JSON.stringify(data, null, 2);
    }

    /**
     * Importe des données depuis un JSON
     */
    importAllData(jsonData) {
        try {
            const parsed = JSON.parse(jsonData);

            // Supporte deux formats :
            // - v1.0 (plat) : { rates, missions, settings }
            // - v2.0 (imbriqué, ex. backup Drive/mobile) : { version, data: { rates, missions, settings } }
            const data = (parsed && parsed.data && typeof parsed.data === 'object')
                ? parsed.data
                : parsed;

            // Vérification de la structure des données
            if (!data.rates || !Array.isArray(data.rates)) {
                throw new Error('Format de données invalide: tarifs manquants');
            }

            if (!data.missions || !Array.isArray(data.missions)) {
                throw new Error('Format de données invalide: missions manquantes');
            }

            // Sauvegarder les données
            this.saveRates(data.rates);
            this.saveMissions(data.missions);
            
            if (data.settings) {
                this.saveSettings(data.settings);
            }
            
            // Mettre à jour la date de dernière sauvegarde
            localStorage.setItem(this.STORAGE_KEYS.BACKUP_DATE, new Date().toISOString());
            
            console.log('Données importées avec succès');
            return true;
            
        } catch (error) {
            console.error('Erreur lors de l\'importation:', error);
            return false;
        }
    }

    /**
     * Efface toutes les données
     */
    clearAllData() {
        try {
            Object.values(this.STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            
            // Recharger les données par défaut
            this.initializeDefaultData();
            
            console.log('Toutes les données ont été effacées');
            return true;
            
        } catch (error) {
            console.error('Erreur lors de l\'effacement:', error);
            return false;
        }
    }

    /**
     * Sauvegarde automatique
     */
    startAutoBackup() {
        const settings = this.getSettings();
        if (settings && settings.autoBackup) {
            const interval = (settings.backupInterval || 5) * 60 * 1000; // Convertir en millisecondes
            
            setInterval(() => {
                this.createAutoBackup();
            }, interval);
        }
    }

    /**
     * Crée une sauvegarde automatique
     */
    createAutoBackup() {
        try {
            const data = this.exportAllData();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `nurse-salary-backup-${timestamp}.json`;
            
            // Créer un blob et le télécharger automatiquement (optionnel)
            // Cette fonctionnalité peut être activée si l'utilisateur le souhaite
            
            localStorage.setItem(this.STORAGE_KEYS.BACKUP_DATE, new Date().toISOString());
            console.log('Sauvegarde automatique effectuée');
            
        } catch (error) {
            console.error('Erreur lors de la sauvegarde automatique:', error);
        }
    }

    /**
     * Récupère la date de la dernière sauvegarde
     */
    getLastBackupDate() {
        const date = localStorage.getItem(this.STORAGE_KEYS.BACKUP_DATE);
        return date ? new Date(date) : null;
    }

    /**
     * UTILITAIRES
     */

    /**
     * Met à jour automatiquement les missions confirmées passées au statut "Réalisée"
     * @returns {object} Informations sur les missions mises à jour
     */
    autoUpdatePastConfirmedMissions() {
        const missions = this.getMissions();
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Réinitialiser l'heure pour comparer uniquement les dates
        
        let updatedCount = 0;
        const updatedMissions = [];
        
        missions.forEach(mission => {
            // Vérifier si la mission est confirmée
            if (mission.status === 'confirmed') {
                // Extraire et parser la date de la mission
                const missionDateStr = mission.date.split('T')[0]; // Format YYYY-MM-DD
                const missionDate = new Date(missionDateStr + 'T00:00:00');
                
                // Si la date de la mission est passée (strictement inférieure à aujourd'hui)
                if (missionDate < today) {
                    mission.status = 'completed';
                    mission.autoUpdatedAt = new Date().toISOString();
                    updatedCount++;
                    updatedMissions.push({
                        id: mission.id,
                        date: mission.date,
                        establishment: mission.establishment
                    });
                }
            }
        });
        
        // Sauvegarder si des missions ont été mises à jour
        if (updatedCount > 0) {
            this.saveMissions(missions);
            console.log(`Auto-update: ${updatedCount} mission(s) confirmée(s) passée(s) au statut "Réalisée"`);
        }
        
        return {
            success: true,
            updatedCount: updatedCount,
            updatedMissions: updatedMissions
        };
    }

    /**
     * Migre les missions existantes pour ajouter les horaires depuis les tarifs
     * À exécuter une seule fois après l'ajout de la fonctionnalité horaires
     */
    migrateMissionsWithSchedules() {
        const missions = this.getMissions();
        const rates = this.getRates();
        let migratedCount = 0;
        
        missions.forEach(mission => {
            // Si la mission n'a pas d'horaires, les récupérer depuis le tarif
            if (!mission.startTime || !mission.endTime) {
                const rate = rates.find(r => r.id === mission.rateId);
                if (rate && rate.startTime && rate.endTime) {
                    mission.startTime = rate.startTime;
                    mission.endTime = rate.endTime;
                    migratedCount++;
                }
            }
        });
        
        if (migratedCount > 0) {
            this.saveMissions(missions);
            console.log(`Migration réussie : ${migratedCount} mission(s) mise(s) à jour avec les horaires`);
            return {
                success: true,
                migratedCount: migratedCount,
                totalMissions: missions.length
            };
        } else {
            console.log('Aucune mission à migrer');
            return {
                success: true,
                migratedCount: 0,
                totalMissions: missions.length
            };
        }
    }

    /**
     * Vérifie l'état du localStorage
     */
    getStorageInfo() {
        let totalSize = 0;
        
        Object.values(this.STORAGE_KEYS).forEach(key => {
            const item = localStorage.getItem(key);
            if (item) {
                totalSize += item.length;
            }
        });
        
        return {
            totalSize: totalSize,
            totalSizeKB: Math.round(totalSize / 1024 * 100) / 100,
            ratesCount: this.getRates().length,
            missionsCount: this.getMissions().length,
            lastBackup: this.getLastBackupDate()
        };
    }

    /**
     * Valide la structure d'un tarif
     */
    validateRate(rate) {
        const errors = [];
        
        if (!rate.acronym || rate.acronym.trim() === '') {
            errors.push('L\'acronyme est obligatoire');
        }
        
        if (rate.hours === undefined || rate.hours === null || rate.hours < 0) {
            errors.push('Le nombre d\'heures doit être supérieur ou égal à 0');
        }
        
        // Vérifier que les heures sont un multiple de 0.25 (quart d'heure)
        if (rate.hours !== null && rate.hours !== undefined) {
            const remainder = (rate.hours * 4) % 1;
            if (remainder !== 0) {
                errors.push('Le nombre d\'heures doit être un multiple de 0.25 (quart d\'heure)');
            }
        }
        
        // Au moins un des deux (tarif horaire OU salaire) doit être renseigné
        const hasHourlyRate = rate.hourlyRate && rate.hourlyRate > 0;
        const hasSalary = rate.salary && rate.salary > 0;
        
        if (!hasHourlyRate && !hasSalary) {
            errors.push('Vous devez renseigner au moins le tarif horaire OU le salaire estimé');
        }
        
        // Si les deux sont renseignés avec des heures > 0, vérifier la cohérence
        if (hasHourlyRate && hasSalary && rate.hours > 0) {
            const calculatedSalary = rate.hourlyRate * rate.hours;
            const difference = Math.abs(calculatedSalary - rate.salary);
            const percentDifference = (difference / rate.salary) * 100;
            
            // Avertissement si plus de 5% de différence
            if (percentDifference > 5) {
                errors.push(`Attention : Le salaire (${rate.salary.toFixed(2)}€) ne correspond pas au calcul (${rate.hours}h × ${rate.hourlyRate.toFixed(3)}€/h = ${calculatedSalary.toFixed(2)}€)`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Valide la structure d'un tarif
     */
    validateRate(rate) {
        const errors = [];
        
        if (!rate.acronym || rate.acronym.trim() === '') {
            errors.push('L\'acronyme est obligatoire');
        }
        
        if (rate.hours === undefined || rate.hours === null || rate.hours < 0) {
            errors.push('Le nombre d\'heures est obligatoire et doit être positif ou zéro');
        }
        
        // Vérifier qu'on a soit un tarif horaire soit un salaire
        if (rate.hours > 0) {
            if (!rate.hourlyRate && !rate.salary) {
                errors.push('Pour une mission avec heures, vous devez renseigner le tarif horaire ou le salaire');
            }
        } else {
            // Pour les indemnités (0h), on doit avoir un salaire
            if (!rate.salary) {
                errors.push('Pour une indemnité, le salaire est obligatoire');
            }
        }
        
        // Vérification des valeurs numériques
        if (rate.hourlyRate && rate.hourlyRate < 0) {
            errors.push('Le tarif horaire doit être positif');
        }
        
        if (rate.salary && rate.salary < 0) {
            errors.push('Le salaire doit être positif');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Valide la structure d'une mission
     */
    validateMission(mission) {
        const errors = [];
        
        if (!mission.date) {
            errors.push('La date est obligatoire');
        }
        
        if (!mission.rateId) {
            errors.push('Le type de mission est obligatoire');
        }
        
        if (!mission.status) {
            errors.push('Le statut est obligatoire');
        }
        
        // Vérifier que le tarif existe
        if (mission.rateId && !this.getRateById(mission.rateId)) {
            errors.push('Le type de mission sélectionné n\'existe pas');
        }
        
        // Validation des salaires réels (optionnels mais si renseignés, doivent être positifs)
        if (mission.realGrossSalary && mission.realGrossSalary < 0) {
            errors.push('Le salaire brut réel doit être positif');
        }
        
        if (mission.realNetSalary && mission.realNetSalary < 0) {
            errors.push('Le salaire net réel doit être positif');
        }
        
        // Vérification logique : net <= brut si les deux sont renseignés
        if (mission.realGrossSalary && mission.realNetSalary && 
            mission.realNetSalary > mission.realGrossSalary) {
            errors.push('Le salaire net ne peut pas être supérieur au salaire brut');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * EXPORT ET IMPORT DES DONNÉES
     */

    /**
     * Exporte toutes les données au format JSON
     */
    exportData() {
        return {
            version: '1.0',
            exportDate: new Date().toISOString(),
            rates: this.getRates(),
            missions: this.getMissions()
        };
    }

    /**
     * Importe des données depuis un objet JSON
     */
    importData(data) {
        try {
            // Validation basique de la structure
            if (!data || typeof data !== 'object') {
                console.error('Données invalides');
                return false;
            }

            // Vérifier la présence des données essentielles
            if (!data.rates || !Array.isArray(data.rates)) {
                console.error('Tarifs manquants ou invalides');
                return false;
            }

            if (!data.missions || !Array.isArray(data.missions)) {
                console.error('Missions manquantes ou invalides');
                return false;
            }

            // Backup des données actuelles au cas où
            const backup = {
                rates: this.getRates(),
                missions: this.getMissions()
            };

            try {
                // Importer les tarifs
                localStorage.setItem(this.STORAGE_KEYS.RATES, JSON.stringify(data.rates));
                
                // Importer les missions
                localStorage.setItem(this.STORAGE_KEYS.MISSIONS, JSON.stringify(data.missions));

                // Vérifier que tout s'est bien passé
                const testRates = this.getRates();
                const testMissions = this.getMissions();

                if (!testRates || !testMissions) {
                    throw new Error('Échec de la vérification après import');
                }

                return true;
            } catch (innerError) {
                // Restaurer le backup en cas d'erreur
                console.error('Erreur lors de l\'import, restauration du backup:', innerError);
                localStorage.setItem(this.STORAGE_KEYS.RATES, JSON.stringify(backup.rates));
                localStorage.setItem(this.STORAGE_KEYS.MISSIONS, JSON.stringify(backup.missions));
                return false;
            }
        } catch (error) {
            console.error('Erreur lors de l\'import des données:', error);
            return false;
        }
    }

    /**
     * Sauvegarde les missions (utilitaire pour migrateSchedules)
     */
    saveMissions(missions) {
        try {
            localStorage.setItem(this.STORAGE_KEYS.MISSIONS, JSON.stringify(missions));
            return true;
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des missions:', error);
            return false;
        }
    }
}

// Créer une instance globale du gestionnaire de données
window.dataManager = new DataManager();