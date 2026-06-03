/**
 * Application principale - Gestion de l'interface utilisateur
 * Point d'entrée de l'application de suivi des salaires infirmier
 */

class NurseSalaryApp {
    constructor() {
        // Références aux gestionnaires
        this.dataManager = window.dataManager;
        this.salaryManager = window.salaryManager;
        
        // État de l'application
        this.currentSection = 'dashboard';
        this.currentEditingRate = null;
        this.currentEditingMission = null;

        // Événement d'installation PWA différé (capturé via beforeinstallprompt)
        this.deferredInstallPrompt = null;
        this.setupInstallPrompt();

        // Initialiser l'application
        this.init();
    }

    /**
     * Initialisation de l'application
     */
    init() {
        // Attendre que le DOM soit chargé
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupApp());
        } else {
            this.setupApp();
        }
    }

    /**
     * Configuration de l'application
     */
    setupApp() {
        this.setupEventListeners();
        
        // Vérifier et mettre à jour automatiquement les missions confirmées passées
        this.autoUpdateMissionStatuses();
        
        this.loadPlanning();
        this.showNotification('Application chargée avec succès', 'success');
        
        // Enregistrer le Service Worker pour PWA
        this.registerServiceWorker();
    }

    /**
     * Enregistre le Service Worker pour le support PWA
     */
    registerServiceWorker() {
        // Skip si on est en file:// (développement local sans serveur)
        if (window.location.protocol === 'file:') {
            console.log('Service Worker désactivé en mode file:// - utilisez un serveur local pour activer la PWA');
            return;
        }
        
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(registration => {
                        console.log('Service Worker enregistré avec succès:', registration.scope);
                        
                        // Écouter les mises à jour
                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing;
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // Nouvelle version disponible
                                    this.showNotification(
                                        'Une nouvelle version est disponible. Actualisez la page pour l\'installer.',
                                        'info',
                                        10000
                                    );
                                }
                            });
                        });
                    })
                    .catch(error => {
                        console.log('Échec de l\'enregistrement du Service Worker:', error);
                    });
            });

            // Écouter les messages du Service Worker
            navigator.serviceWorker.addEventListener('message', event => {
                if (event.data && event.data.type === 'SW_UPDATED') {
                    this.showNotification(event.data.message, 'info', 8000);
                }
            });
        }
    }

    /**
     * Capture l'événement d'installation PWA pour pouvoir le déclencher
     * depuis notre bouton personnalisé (toujours présent dans Sauvegarde).
     */
    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            // Empêcher l'affichage automatique pour le piloter via notre bouton
            e.preventDefault();
            this.deferredInstallPrompt = e;
        });

        window.addEventListener('appinstalled', () => {
            this.deferredInstallPrompt = null;
            this.showNotification('Application installée avec succès 🎉', 'success');
        });
    }

    /**
     * Indique si l'app tourne déjà en mode installé (standalone).
     */
    isRunningStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    }

    /**
     * Déclenche l'installation de la PWA, ou affiche les instructions
     * manuelles si le navigateur ne fournit pas l'invite native (iOS, etc.).
     */
    async installPWA() {
        // Déjà installée
        if (this.isRunningStandalone()) {
            this.showNotification('L\'application est déjà installée sur cet appareil.', 'info');
            return;
        }

        // Invite native disponible (Chrome/Edge/Android)
        if (this.deferredInstallPrompt) {
            this.deferredInstallPrompt.prompt();
            const choice = await this.deferredInstallPrompt.userChoice;
            if (choice && choice.outcome === 'accepted') {
                this.showNotification('Installation en cours...', 'success');
            }
            this.deferredInstallPrompt = null;
            return;
        }

        // Pas d'invite native : instructions manuelles selon la plateforme
        const ua = navigator.userAgent || '';
        const isIOS = /iphone|ipad|ipod/i.test(ua);
        let message;
        if (isIOS) {
            message = '📲 <strong>Sur iPhone/iPad (Safari) :</strong><br>' +
                      'Touchez le bouton Partager <i class="fas fa-arrow-up-from-bracket"></i> puis ' +
                      '« Sur l\'écran d\'accueil ».';
        } else {
            message = '📲 <strong>Pour installer :</strong><br>' +
                      'Ouvrez le menu du navigateur (⋮) puis « Installer l\'application » / ' +
                      '« Ajouter à l\'écran d\'accueil ».';
        }
        this.showNotification(message, 'info', 10000);
    }

    /**
     * GESTION DES ÉVÉNEMENTS
     */
    setupEventListeners() {
        // Navigation principale
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.closest('.nav-btn').dataset.section;
                this.navigateToSection(section);
            });
        });

        // Boutons d'action principaux
        this.setupMainActionButtons();
        
        // Modales
        this.setupModalEvents();
        
        // Navigation du calendrier
        this.setupCalendarNavigation();
        
        // Sauvegarde
        this.setupBackupEvents();
    }

    /**
     * Configuration des boutons d'action principaux
     */
    setupMainActionButtons() {
        // Ajouter un tarif
        const addRateBtn = document.getElementById('add-rate-btn');
        if (addRateBtn) {
            addRateBtn.addEventListener('click', () => this.openRateModal());
        }

        // Ajouter une mission
        const addMissionBtn = document.getElementById('add-mission-btn');
        if (addMissionBtn) {
            addMissionBtn.addEventListener('click', () => this.openMissionModal());
        }
    }

    /**
     * Configuration des événements des modales
     */
    setupModalEvents() {
        // Modale tarifs
        const rateModal = document.getElementById('rate-modal');
        const rateForm = document.getElementById('rate-form');
        const cancelRateBtn = document.getElementById('cancel-rate');

        if (rateForm) {
            rateForm.addEventListener('submit', (e) => this.handleRateSubmit(e));
        }
        
        if (cancelRateBtn) {
            cancelRateBtn.addEventListener('click', () => this.closeModal('rate-modal'));
        }

        // Modale missions
        const missionModal = document.getElementById('mission-modal');
        const missionForm = document.getElementById('mission-form');
        const cancelMissionBtn = document.getElementById('cancel-mission');
        const deleteMissionBtn = document.getElementById('delete-mission');

        if (missionForm) {
            missionForm.addEventListener('submit', (e) => this.handleMissionSubmit(e));
        }
        
        if (cancelMissionBtn) {
            cancelMissionBtn.addEventListener('click', () => this.closeModal('mission-modal'));
        }

        if (deleteMissionBtn) {
            deleteMissionBtn.addEventListener('click', () => this.handleMissionDelete());
        }

        // Accordéons de la modale mission (ouverture/fermeture au clic sur l'en-tête)
        document.querySelectorAll('#mission-form .accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                header.closest('.accordion').classList.toggle('open');
            });
        });

        // Quand le statut passe à "Réalisée", on déplie automatiquement "Salaire réel"
        const missionStatusSelect = document.getElementById('mission-status');
        if (missionStatusSelect) {
            missionStatusSelect.addEventListener('change', (e) => {
                this.setAccordionOpen('salaire-reel', e.target.value === 'completed');
            });
        }

        // Case "ne pas saisir le salaire réel"
        const skipSalaryChk = document.getElementById('mission-skip-real-salary');
        if (skipSalaryChk) {
            skipSalaryChk.addEventListener('change', () => {
                this.applySkipRealSalaryState();
                // En décochant, reproposer le bouton de reprise si pertinent
                if (!skipSalaryChk.checked && this.currentEditingMission) {
                    const mission = this.dataManager.getMissionById(this.currentEditingMission);
                    if (mission) this.prefillRealSalaryFromSimilar(mission);
                }
            });
        }

        // Fermeture des modales en cliquant sur la croix.
        // Pour les modales tarif et mission, la croix sauvegarde automatiquement
        // (comme "Enregistrer") avant de fermer. Si la sauvegarde échoue
        // (validation), la modale reste ouverte avec le message d'erreur.
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (!modal) return;

                if (modal.id === 'mission-modal') {
                    this.saveAndCloseForm('mission-form');
                } else if (modal.id === 'rate-modal') {
                    this.saveAndCloseForm('rate-form');
                } else {
                    this.closeModal(modal.id);
                }
            });
        });

        // Retirer la fermeture par clic à l'extérieur pour éviter les fermetures accidentelles
        // Les modales ne se ferment que par les boutons explicites
    }

    /**
     * Configuration des événements de sauvegarde
     */
    setupBackupEvents() {
        // Export ICS (Calendar)
        const exportIcsBtn = document.getElementById('export-ics-btn');
        if (exportIcsBtn) {
            exportIcsBtn.addEventListener('click', () => this.exportToCalendar());
        }

        // Export données JSON
        const exportDataBtn = document.getElementById('export-data-btn');
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => this.exportData());
        }

        // Import données JSON
        const importFileInput = document.getElementById('import-file');
        const importDataBtn = document.getElementById('import-data-btn');
        
        if (importFileInput) {
            importFileInput.addEventListener('change', (e) => this.importData(e));
        }
        
        if (importDataBtn) {
            importDataBtn.addEventListener('click', () => {
                document.getElementById('import-file').click();
            });
        }

        // Reset données
        const resetDataBtn = document.getElementById('reset-data-btn');
        if (resetDataBtn) {
            resetDataBtn.addEventListener('click', () => this.resetData());
        }

        // Installation de la PWA
        const installBtn = document.getElementById('install-pwa-btn');
        if (installBtn) {
            installBtn.addEventListener('click', () => this.installPWA());
        }
        
        // Google Drive
        this.setupGoogleDriveEvents();
    }

    /**
     * Configuration de la navigation du calendrier
     */
    setupCalendarNavigation() {
        // Navigation du planning
        const prevBtn = document.getElementById('prev-month');
        const nextBtn = document.getElementById('next-month');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.salaryManager.goToPreviousMonth();
                this.loadPlanning();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.salaryManager.goToNextMonth();
                this.loadPlanning();
            });
        }
        
        // Navigation du récapitulatif annuel
        const yearlyPrevBtn = document.getElementById('yearly-prev-year');
        const yearlyNextBtn = document.getElementById('yearly-next-year');
        
        if (yearlyPrevBtn) {
            yearlyPrevBtn.addEventListener('click', () => {
                this.salaryManager.goToPreviousYear();
                this.refreshYearlyStats();
            });
        }
        
        if (yearlyNextBtn) {
            yearlyNextBtn.addEventListener('click', () => {
                this.salaryManager.goToNextYear();
                this.refreshYearlyStats();
            });
        }
    }

    /**
     * Configuration des événements Google Drive
     */
    setupGoogleDriveEvents() {
        // Bouton de sauvegarde sur Drive
        const backupBtn = document.getElementById('backup-to-drive-btn');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => this.backupToDrive());
        }
        
        // Bouton de restauration depuis Drive
        const restoreBtn = document.getElementById('restore-from-drive-btn');
        if (restoreBtn) {
            restoreBtn.addEventListener('click', () => this.restoreFromDrive());
        }
        
        // Bouton de configuration
        const configBtn = document.getElementById('configure-drive-btn');
        if (configBtn) {
            configBtn.addEventListener('click', () => this.openDriveConfigModal());
        }
        
        // Modale de configuration
        const configForm = document.getElementById('drive-config-form');
        if (configForm) {
            configForm.addEventListener('submit', (e) => this.handleDriveConfig(e));
        }
        
        const cancelConfigBtn = document.getElementById('cancel-drive-config');
        if (cancelConfigBtn) {
            cancelConfigBtn.addEventListener('click', () => this.closeModal('drive-config-modal'));
        }
        
        const testBtn = document.getElementById('test-drive-connection');
        if (testBtn) {
            testBtn.addEventListener('click', () => this.testDriveConnection());
        }
        
        // Fermeture de la modale
        const modalClose = document.querySelector('#drive-config-modal .modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeModal('drive-config-modal'));
        }
    }
    
    /**
     * Sauvegarder sur Google Drive
     */
    async backupToDrive() {
        try {
            // Vérifier la configuration
            if (!window.googleDriveSync.isConfigured()) {
                this.showNotification(
                    '⚠️ Google Drive n\'est pas configuré. Cliquez sur "Configurer Google Drive" pour commencer.',
                    'warning'
                );
                return;
            }
            
            // Afficher le statut
            this.showNotification('🔄 Sauvegarde en cours...', 'info');
            
            // Effectuer la sauvegarde
            const result = await window.googleDriveSync.backup();
            
            // Mettre à jour l'interface
            this.updateDriveSyncStatus();
            
            // Afficher le succès
            this.showNotification(
                '✅ Sauvegarde réussie sur Google Drive !',
                'success',
                5000
            );
            
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            this.showNotification(
                `❌ Erreur lors de la sauvegarde : ${error.message}`,
                'error'
            );
        }
    }
    
    /**
     * Restaurer depuis Google Drive
     */
    async restoreFromDrive() {
        try {
            // Vérifier la configuration
            if (!window.googleDriveSync.isConfigured()) {
                this.showNotification(
                    '⚠️ Google Drive n\'est pas configuré. Cliquez sur "Configurer Google Drive" pour commencer.',
                    'warning'
                );
                return;
            }
            
            // Afficher le statut
            this.showNotification('🔄 Récupération en cours...', 'info');
            
            // Effectuer la restauration
            const result = await window.googleDriveSync.restore();
            
            if (result.success) {
                // Recharger l'interface
                this.loadSectionContent(this.currentSection);
                
                // Mettre à jour le statut
                this.updateDriveSyncStatus();
                
                // Afficher le succès
                this.showNotification(
                    `✅ ${result.message}`,
                    'success',
                    8000
                );
            } else {
                this.showNotification(result.message, 'warning');
            }
            
        } catch (error) {
            console.error('Erreur lors de la restauration:', error);
            this.showNotification(
                `❌ Erreur lors de la restauration : ${error.message}`,
                'error'
            );
        }
    }
    
    /**
     * Ouvrir la modale de configuration Google Drive
     */
    openDriveConfigModal() {
        const modal = document.getElementById('drive-config-modal');
        if (!modal) return;
        
        // Pré-remplir les champs si déjà configuré
        const config = window.googleDriveSync;
        if (config.scriptUrl) {
            document.getElementById('script-url').value = config.scriptUrl;
        }
        if (config.token) {
            document.getElementById('script-token').value = config.token;
        }
        
        this.showModal('drive-config-modal');
    }
    
    /**
     * Gérer la soumission de la configuration Google Drive
     */
    handleDriveConfig(e) {
        e.preventDefault();
        
        const scriptUrl = document.getElementById('script-url').value;
        const token = document.getElementById('script-token').value;
        
        if (!scriptUrl || !token) {
            this.showNotification('⚠️ Veuillez remplir tous les champs', 'warning');
            return;
        }
        
        // Sauvegarder la configuration
        window.googleDriveSync.saveConfig(scriptUrl, token);
        
        // Fermer la modale
        this.closeModal('drive-config-modal');
        
        // Mettre à jour le statut
        this.updateDriveSyncStatus();
        
        this.showNotification(
            '✅ Configuration Google Drive enregistrée ! Vous pouvez maintenant sauvegarder et restaurer.',
            'success',
            5000
        );
    }
    
    /**
     * Tester la connexion Google Drive
     */
    async testDriveConnection() {
        try {
            // Récupérer les valeurs du formulaire
            const scriptUrl = document.getElementById('script-url').value;
            const token = document.getElementById('script-token').value;
            
            if (!scriptUrl || !token) {
                this.showNotification('⚠️ Veuillez remplir l\'URL et le token', 'warning');
                return;
            }
            
            // Sauvegarder temporairement la config pour le test
            const oldUrl = window.googleDriveSync.scriptUrl;
            const oldToken = window.googleDriveSync.token;
            
            window.googleDriveSync.scriptUrl = scriptUrl;
            window.googleDriveSync.token = token;
            
            this.showNotification('🔄 Test de connexion en cours...', 'info');
            
            // Tester la connexion
            const success = await window.googleDriveSync.testConnection();
            
            if (success) {
                this.showNotification(
                    '✅ Connexion réussie ! La configuration est valide.',
                    'success'
                );
            } else {
                this.showNotification(
                    '❌ Échec de la connexion. Vérifiez l\'URL et le token.',
                    'error'
                );
                // Restaurer l'ancienne config si le test échoue
                window.googleDriveSync.scriptUrl = oldUrl;
                window.googleDriveSync.token = oldToken;
            }
            
        } catch (error) {
            console.error('Erreur lors du test:', error);
            this.showNotification(
                `❌ Erreur lors du test : ${error.message}`,
                'error'
            );
        }
    }
    
    /**
     * Mettre à jour le statut de synchronisation Google Drive
     */
    updateDriveSyncStatus() {
        const statusIcon = document.getElementById('sync-status-icon');
        const statusText = document.getElementById('sync-status-text');
        
        if (!statusIcon || !statusText) return;
        
        const status = window.googleDriveSync.getSyncStatus();
        
        statusIcon.textContent = status.icon;
        statusText.textContent = status.text;
        
        // Mettre à jour la classe CSS du conteneur
        const statusContainer = document.getElementById('sync-status');
        if (statusContainer) {
            statusContainer.className = `sync-status ${status.class}`;
        }
    }

    /**
     * NAVIGATION ENTRE SECTIONS
     */
    navigateToSection(sectionName) {
        // Mettre à jour la navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Masquer toutes les sections
        document.querySelectorAll('.app-section').forEach(section => {
            section.classList.remove('active');
        });

        // Afficher la section demandée
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionName;
        }

        // Charger le contenu spécifique à la section
        this.loadSectionContent(sectionName);
    }

    /**
     * Charge le contenu spécifique à chaque section
     */
    loadSectionContent(sectionName) {
        switch (sectionName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'rates':
                this.loadRates();
                break;
            case 'planning':
                this.loadPlanning();
                break;
            case 'backup':
                this.loadBackup();
                break;
        }
    }

    /**
     * TABLEAU DE BORD
     */
    loadDashboard() {
        // Vérifier et mettre à jour les statuts avant d'afficher
        this.autoUpdateMissionStatuses();
        
        const dashboardData = this.salaryManager.getDashboardData();

        // Afficher le récapitulatif annuel par établissement
        this.displayYearlyStatsByEstablishment(dashboardData.yearlyStats);
        
        // Mettre à jour l'état des boutons de navigation annuelle
        this.updateYearNavigationButtons();
    }

    /**
     * Affiche les prochaines missions
     */
    displayUpcomingMissions(missions) {
        const container = document.getElementById('upcoming-missions');
        if (!container) return;

        if (missions.length === 0) {
            container.innerHTML = '<p class="text-muted">Aucune mission planifiée dans les 7 prochains jours</p>';
            return;
        }

        const missionsHtml = missions.map(mission => `
            <div class="mission-row">
                <div class="mission-date">${mission.formattedDate}</div>
                <div class="mission-details">
                    <div class="mission-type">${mission.rate ? mission.rate.acronym : 'Type inconnu'}</div>
                    <div class="mission-info">
                        ${mission.establishment ? mission.establishment + ' - ' : ''}
                        ${mission.service || ''}
                        ${mission.rate ? (mission.rate.hours === 0 ? '(Indemnité)' : `(${mission.rate.hours}h)`) : ''}
                    </div>
                </div>
                <div class="mission-salary">
                    ${mission.rate ? this.salaryManager.formatCurrency(mission.rate.salary) : ''}
                </div>
                <div class="mission-status status-${mission.status}">
                    ${this.salaryManager.getStatusLabel(mission.status)}
                </div>
            </div>
        `).join('');

        container.innerHTML = missionsHtml;
    }

    /**
     * Affiche le récapitulatif annuel par établissement
     */
    displayYearlyStatsByEstablishment(yearlyStats) {
        if (!yearlyStats) return;
        
        // Mettre à jour l'année
        const yearElement = document.getElementById('yearly-summary-year');
        if (yearElement) {
            yearElement.textContent = yearlyStats.year;
        }

        // Avertir si des missions réalisées de l'année n'ont pas le salaire réel
        // (brut ET net) renseigné → les totaux "réels" sont alors incomplets/faux.
        this.displayIncompleteSalaryWarning(yearlyStats.year);
        
        // Afficher les cartes par établissement
        const container = document.getElementById('establishment-summary-cards');
        if (!container) return;
        
        if (yearlyStats.establishments.length === 0) {
            container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 2rem;">Aucune mission réalisée cette année</p>';
        } else {
            const cardsHtml = yearlyStats.establishments.map(establishment => `
                <div class="establishment-card">
                    <div class="establishment-card-header">
                        <h4><i class="fas fa-hospital"></i> ${establishment.name}</h4>
                    </div>
                    <div class="establishment-stats-grid">
                        <div class="establishment-stat">
                            <span class="establishment-stat-value">${establishment.missions}</span>
                            <span class="establishment-stat-label">Missions</span>
                        </div>
                        <div class="establishment-stat">
                            <span class="establishment-stat-value">${establishment.hours}h</span>
                            <span class="establishment-stat-label">Heures</span>
                        </div>
                        <div class="establishment-stat">
                            <span class="establishment-stat-value">${establishment.formattedGross}</span>
                            <span class="establishment-stat-label">Brut réel</span>
                        </div>
                        <div class="establishment-stat">
                            <span class="establishment-stat-value">${establishment.formattedNet}</span>
                            <span class="establishment-stat-label">Net réel</span>
                        </div>
                        <div class="establishment-stat">
                            <span class="establishment-stat-value">${establishment.formattedHourly}</span>
                            <span class="establishment-stat-label">€/h net</span>
                        </div>
                    </div>
                </div>
            `).join('');
            
            container.innerHTML = cardsHtml;
        }
        
        // Mettre à jour les totaux généraux
        this.updateElement('yearly-total-missions', yearlyStats.totals.missions);
        this.updateElement('yearly-total-hours', `${yearlyStats.totals.hours}h`);
        this.updateElement('yearly-total-gross', yearlyStats.totals.formattedGross);
        this.updateElement('yearly-total-net', yearlyStats.totals.formattedNet);
        this.updateElement('yearly-total-hourly', yearlyStats.totals.formattedHourly);
    }

    /**
     * Affiche un avertissement si des missions réalisées de l'année donnée
     * n'ont pas leur salaire réel (brut ET net) renseigné. Dans ce cas les
     * totaux "réels" sont incomplets, donc faux.
     */
    displayIncompleteSalaryWarning(year) {
        const warning = document.getElementById('yearly-incomplete-warning');
        if (!warning) return;

        const incomplete = this.dataManager.getMissions().filter(mission => {
            if (mission.status !== 'completed') return false;
            if (mission.skipRealSalary) return false; // salaire volontairement non saisi
            if (!this.isPastMonth(mission.date)) return false; // mois courant/futur ignorés
            const missionYear = new Date(mission.date + 'T00:00:00').getFullYear();
            if (missionYear !== year) return false;
            const hasGross = mission.realGrossSalary != null && mission.realGrossSalary !== '';
            const hasNet = mission.realNetSalary != null && mission.realNetSalary !== '';
            return !(hasGross && hasNet);
        });

        if (incomplete.length === 0) {
            warning.style.display = 'none';
            warning.innerHTML = '';
            return;
        }

        warning.style.display = 'block';
        warning.innerHTML = `
            <i class="fas fa-triangle-exclamation"></i>
            <strong>${incomplete.length} mission(s) réalisée(s)</strong> sans salaire brut/net complet :
            les totaux réels ci-dessous sont <strong>incomplets</strong>.
        `;
    }
    
    /**
     * Rafraîchit uniquement les statistiques annuelles
     */
    refreshYearlyStats() {
        const yearlyStats = this.salaryManager.getYearlyStatsByEstablishment();
        this.displayYearlyStatsByEstablishment(yearlyStats);
        
        // Mettre à jour l'état des boutons de navigation
        this.updateYearNavigationButtons();
    }
    
    /**
     * Met à jour l'état des boutons de navigation annuelle
     */
    updateYearNavigationButtons() {
        const currentYear = new Date().getFullYear();
        const selectedYear = this.salaryManager.selectedYearlyYear;
        
        // Trouver la première année avec des missions
        const missions = this.dataManager.getMissions();
        let minYear = currentYear;
        
        if (missions.length === 0) {
            // Pas de missions, désactiver les deux boutons
            const prevBtn = document.getElementById('yearly-prev-year');
            const nextBtn = document.getElementById('yearly-next-year');
            
            if (prevBtn) {
                prevBtn.disabled = true;
                prevBtn.style.opacity = '0.3';
                prevBtn.style.cursor = 'not-allowed';
            }
            
            if (nextBtn) {
                nextBtn.disabled = true;
                nextBtn.style.opacity = '0.3';
                nextBtn.style.cursor = 'not-allowed';
            }
            return;
        }
        
        missions.forEach(mission => {
            const missionYear = new Date(mission.date).getFullYear();
            if (missionYear < minYear) {
                minYear = missionYear;
            }
        });
        
        // Désactiver le bouton précédent si on est à la première année
        const prevBtn = document.getElementById('yearly-prev-year');
        if (prevBtn) {
            prevBtn.disabled = selectedYear <= minYear;
            prevBtn.style.opacity = selectedYear <= minYear ? '0.3' : '1';
            prevBtn.style.cursor = selectedYear <= minYear ? 'not-allowed' : 'pointer';
        }
        
        // Désactiver le bouton suivant si on est à l'année courante
        const nextBtn = document.getElementById('yearly-next-year');
        if (nextBtn) {
            nextBtn.disabled = selectedYear >= currentYear;
            nextBtn.style.opacity = selectedYear >= currentYear ? '0.3' : '1';
            nextBtn.style.cursor = selectedYear >= currentYear ? 'not-allowed' : 'pointer';
        }
    }

    /**
     * GESTION DES TARIFS
     */
    loadRates() {
        const ratesData = this.salaryManager.getRatesTableData();
        this.displayRatesTable(ratesData);
    }

    /**
     * Affiche le tableau des tarifs
     */
    displayRatesTable(rates) {
        const tbody = document.getElementById('rates-table-body');
        if (!tbody) return;

        if (rates.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Aucun tarif configuré</td></tr>';
            return;
        }

        const ratesHtml = rates.map(rate => `
            <tr>
                <td><strong>${rate.acronym}</strong> ${rate.excludeFromCount ? '<span style="color: #ff6b6b; font-size: 0.85em;" title="Non compté dans les statistiques">[NC]</span>' : ''}</td>
                <td>${rate.description || '-'}</td>
                <td>${rate.establishment || '-'}</td>
                <td>${rate.hours === 0 ? 'Indemnité' : rate.hours + 'h'}</td>
                <td>${rate.formattedSalary}</td>
                <td>${rate.hours === 0 ? '-' : (rate.hourlyRate ? rate.hourlyRate.toFixed(3) + '€/h' : rate.formattedHourlyRate)}</td>
                <td class="actions">
                    <button class="btn btn-small btn-secondary" onclick="app.editRate('${rate.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-small btn-danger" onclick="app.deleteRate('${rate.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = ratesHtml;
    }

    /**
     * Ouvre la modale pour ajouter/modifier un tarif
     */
    openRateModal(rateId = null) {
        const modal = document.getElementById('rate-modal');
        const form = document.getElementById('rate-form');
        const title = document.getElementById('rate-modal-title');
        
        if (!modal || !form) return;

        // Réinitialiser le formulaire
        form.reset();
        this.currentEditingRate = rateId;

        // Charger les établissements existants
        this.loadEstablishmentsList('establishments-list');
        
        // Configurer le calcul automatique entre tarif horaire et salaire
        this.setupRateCalculation();

        if (rateId) {
            // Mode édition
            const rate = this.dataManager.getRateById(rateId);
            if (rate) {
                title.textContent = 'Modifier le tarif';
                document.getElementById('rate-acronym').value = rate.acronym;
                document.getElementById('rate-description').value = rate.description || '';
                document.getElementById('rate-establishment').value = rate.establishment || '';
                document.getElementById('rate-hours').value = rate.hours;
                document.getElementById('rate-hourly-rate').value = rate.hourlyRate || '';
                document.getElementById('rate-salary').value = rate.salary || '';
                document.getElementById('rate-start-time').value = rate.startTime || '';
                document.getElementById('rate-end-time').value = rate.endTime || '';
                document.getElementById('rate-exclude-from-count').checked = rate.excludeFromCount || false;
            }
        } else {
            // Mode création
            title.textContent = 'Ajouter un tarif';
            // S'assurer que la case est décochée pour un nouveau tarif
            document.getElementById('rate-exclude-from-count').checked = false;
        }

        this.showModal('rate-modal');
    }

    /**
     * Configure le calcul automatique entre tarif horaire et salaire
     */
    setupRateCalculation() {
        const hoursInput = document.getElementById('rate-hours');
        const hourlyRateInput = document.getElementById('rate-hourly-rate');
        const salaryInput = document.getElementById('rate-salary');
        
        if (!hoursInput || !hourlyRateInput || !salaryInput) return;

        // Fonction pour calculer le salaire depuis tarif horaire
        const calculateSalaryFromHourly = () => {
            const hours = parseFloat(hoursInput.value);
            const hourlyRate = parseFloat(hourlyRateInput.value);
            
            if (hours > 0 && hourlyRate > 0 && !salaryInput.value) {
                const calculatedSalary = hours * hourlyRate;
                salaryInput.value = calculatedSalary.toFixed(3);
            }
        };

        // Fonction pour calculer le tarif horaire depuis salaire
        const calculateHourlyFromSalary = () => {
            const hours = parseFloat(hoursInput.value);
            const salary = parseFloat(salaryInput.value);
            
            if (hours > 0 && salary > 0 && !hourlyRateInput.value) {
                const calculatedHourly = salary / hours;
                hourlyRateInput.value = calculatedHourly.toFixed(3);
            }
        };

        // Retirer les anciens event listeners en clonant les éléments
        const newHoursInput = hoursInput.cloneNode(true);
        const newHourlyRateInput = hourlyRateInput.cloneNode(true);
        const newSalaryInput = salaryInput.cloneNode(true);
        
        hoursInput.parentNode.replaceChild(newHoursInput, hoursInput);
        hourlyRateInput.parentNode.replaceChild(newHourlyRateInput, hourlyRateInput);
        salaryInput.parentNode.replaceChild(newSalaryInput, salaryInput);

        // Ajouter les événements de calcul automatique
        newHoursInput.addEventListener('input', () => {
            calculateSalaryFromHourly();
            calculateHourlyFromSalary();
        });
        
        newHourlyRateInput.addEventListener('input', calculateSalaryFromHourly);
        newSalaryInput.addEventListener('input', calculateHourlyFromSalary);
    }

    /**
     * Gère la soumission du formulaire de tarif
     */
    handleRateSubmit(e) {
        e.preventDefault();
        
        const hours = parseFloat(document.getElementById('rate-hours').value);
        const hourlyRate = parseFloat(document.getElementById('rate-hourly-rate').value) || null;
        const salary = parseFloat(document.getElementById('rate-salary').value) || null;
        
        // Calculer automatiquement ce qui manque si possible
        let finalHourlyRate = hourlyRate;
        let finalSalary = salary;
        
        // Si on a les heures et un seul des deux valeurs, calculer l'autre
        if (hours > 0) {
            if (hourlyRate && !salary) {
                finalSalary = hours * hourlyRate;
            } else if (salary && !hourlyRate) {
                finalHourlyRate = salary / hours;
            }
        }
        
        // Pour les indemnités (0h), on ne calcule pas de tarif horaire
        if (hours === 0 && salary && !hourlyRate) {
            finalHourlyRate = null;
        }
        
        const rateData = {
            acronym: document.getElementById('rate-acronym').value,
            description: document.getElementById('rate-description').value,
            establishment: document.getElementById('rate-establishment').value,
            hours: hours,
            hourlyRate: finalHourlyRate,
            salary: finalSalary,
            startTime: document.getElementById('rate-start-time').value || null,
            endTime: document.getElementById('rate-end-time').value || null,
            excludeFromCount: document.getElementById('rate-exclude-from-count').checked
        };

        // Validation
        const validation = this.dataManager.validateRate(rateData);
        if (!validation.isValid) {
            this.showNotification(validation.errors.join('<br>'), 'error');
            return;
        }

        // Sauvegarde
        let success = false;
        if (this.currentEditingRate) {
            success = this.dataManager.updateRate(this.currentEditingRate, rateData);
        } else {
            success = this.dataManager.addRate(rateData);
        }

        if (success) {
            this.showNotification(
                this.currentEditingRate ? 'Tarif modifié avec succès' : 'Tarif ajouté avec succès',
                'success'
            );
            this.closeModal('rate-modal');
            this.loadRates();
        } else {
            this.showNotification('Erreur lors de la sauvegarde', 'error');
        }
    }

    /**
     * Modifie un tarif
     */
    editRate(rateId) {
        this.openRateModal(rateId);
    }

    /**
     * Supprime un tarif
     */
    deleteRate(rateId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce tarif ?')) {
            return;
        }

        const success = this.dataManager.deleteRate(rateId);
        if (success) {
            this.showNotification('Tarif supprimé avec succès', 'success');
            this.loadRates();
        } else {
            this.showNotification('Erreur lors de la suppression', 'error');
        }
    }

    /**
     * PLANNING
     */
    loadPlanning() {
        // Vérifier et mettre à jour les statuts avant d'afficher
        this.autoUpdateMissionStatuses();
        
        const planningData = this.salaryManager.getPlanningData();
        this.displayCalendar(planningData.calendarData);
        this.updateMonthDisplay(planningData.viewInfo);
        
        // Afficher le récapitulatif mensuel par établissement
        this.displayMonthlyStatsByEstablishment(planningData.monthlyEstablishmentStats);
    }

    /**
     * Affiche le calendrier
     */
    displayCalendar(calendarData) {
        const container = document.getElementById('planning-grid');
        if (!container) return;

        // En-tête du calendrier
        const header = `
            <div class="calendar-header">
                <div>Lun</div>
                <div>Mar</div>
                <div>Mer</div>
                <div>Jeu</div>
                <div>Ven</div>
                <div>Sam</div>
                <div>Dim</div>
            </div>
        `;

        // Jours du calendrier
        const daysHtml = calendarData.map(day => {
            const classes = [
                'calendar-day',
                !day.isCurrentMonth ? 'other-month' : '',
                day.isToday ? 'today' : '',
                day.hasMission ? 'has-mission' : ''
            ].filter(Boolean).join(' ');

            const missionsHtml = day.missions.map(mission => {
                const rate = this.dataManager.getRateById(mission.rateId);

                // Coin coloré indiquant l'état du salaire réel — uniquement pour les
                // missions des MOIS PASSÉS (le mois courant et le futur n'en ont pas).
                // Vert = brut+net renseignés, Rouge = manquant, Gris = volontairement ignoré.
                let salaryCorner = '';
                let cornerTitle = '';
                if (mission.status !== 'cancelled' && this.isPastMonth(mission.date)) {
                    if (mission.skipRealSalary) {
                        salaryCorner = '<span class="salary-corner skipped"></span>';
                        cornerTitle = ' — Salaire inclus dans une autre journée';
                    } else {
                        const salaryDone = mission.realGrossSalary != null && mission.realGrossSalary !== '' &&
                                           mission.realNetSalary != null && mission.realNetSalary !== '';
                        salaryCorner = `<span class="salary-corner ${salaryDone ? 'done' : 'missing'}"></span>`;
                        cornerTitle = salaryDone ? ' — Salaire brut/net renseignés' : ' — Salaire brut/net manquant';
                    }
                }

                return `
                    <div class="mission-item status-${mission.status}"
                         onclick="event.stopPropagation(); app.viewMissionDetails('${mission.id}')"
                         title="${rate ? rate.acronym : 'Inconnu'} - ${mission.establishment || ''}${cornerTitle}">
                        ${rate ? rate.acronym : '?'}${salaryCorner}
                    </div>
                `;
            }).join('');

            return `
                <div class="${classes}" 
                     onclick="app.addMissionToDate('${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}')">
                    <div class="day-number">${day.dayNumber}</div>
                    ${missionsHtml}
                </div>
            `;
        }).join('');

        const calendarGrid = `<div class="calendar-grid">${daysHtml}</div>`;
        container.innerHTML = header + calendarGrid;
    }

    /**
     * Met à jour l'affichage du mois
     */
    updateMonthDisplay(viewInfo) {
        const display = document.getElementById('current-month-display');
        const planningTitle = document.getElementById('planning-month-title');
        
        if (display) {
            display.textContent = viewInfo.monthName;
        }
        
        if (planningTitle) {
            planningTitle.textContent = viewInfo.monthName;
        }
    }
    
    /**
     * Affiche le récapitulatif mensuel par établissement
     */
    displayMonthlyStatsByEstablishment(monthlyStats) {
        if (!monthlyStats) return;
        
        // Afficher les cartes par établissement
        const container = document.getElementById('monthly-establishment-cards');
        if (!container) return;
        
        if (monthlyStats.establishments.length === 0) {
            container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 2rem;">Aucune mission ce mois-ci</p>';
        } else {
            const cardsHtml = monthlyStats.establishments.map(establishment => {
                const differenceClass = establishment.difference >= 0 ? 'difference-positive' : 'difference-negative';
                
                return `
                    <div class="monthly-establishment-card">
                        <div class="establishment-card-header">
                            <h4><i class="fas fa-hospital"></i> ${establishment.name}</h4>
                        </div>
                        <div class="establishment-stats-grid-extended">
                            <div class="establishment-stat">
                                <span class="establishment-stat-value">${establishment.missions}</span>
                                <span class="establishment-stat-label">Missions</span>
                            </div>
                            <div class="establishment-stat">
                                <span class="establishment-stat-value">${establishment.hours}h</span>
                                <span class="establishment-stat-label">Heures</span>
                            </div>
                            <div class="establishment-stat">
                                <span class="establishment-stat-value">${establishment.formattedEstimated}</span>
                                <span class="establishment-stat-label">Net estimé</span>
                            </div>
                            <div class="establishment-stat">
                                <span class="establishment-stat-value">${establishment.formattedGross}</span>
                                <span class="establishment-stat-label">Brut réel</span>
                            </div>
                            <div class="establishment-stat">
                                <span class="establishment-stat-value">${establishment.formattedNet}</span>
                                <span class="establishment-stat-label">Net réel</span>
                            </div>
                            <div class="establishment-stat">
                                <span class="establishment-stat-value">${establishment.formattedHourly}</span>
                                <span class="establishment-stat-label">€/h net</span>
                            </div>
                            <div class="establishment-stat ${differenceClass}">
                                <span class="establishment-stat-value">${establishment.formattedDifference}</span>
                                <span class="establishment-stat-label">Écart</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            container.innerHTML = cardsHtml;
        }
        
        // Mettre à jour les totaux généraux
        this.updateElement('monthly-total-missions', monthlyStats.totals.missions);
        this.updateElement('monthly-total-hours', `${monthlyStats.totals.hours}h`);
        this.updateElement('monthly-total-estimated', monthlyStats.totals.formattedEstimated);
        this.updateElement('monthly-total-gross', monthlyStats.totals.formattedGross);
        this.updateElement('monthly-total-net', monthlyStats.totals.formattedNet);
        this.updateElement('monthly-total-hourly', monthlyStats.totals.formattedHourly);
        
        // Gérer l'affichage de l'écart avec la classe appropriée
        const differenceElement = document.getElementById('monthly-total-difference');
        if (differenceElement) {
            differenceElement.textContent = monthlyStats.totals.formattedDifference;
            differenceElement.parentElement.classList.remove('difference-positive', 'difference-negative');
            differenceElement.parentElement.classList.add(monthlyStats.totals.differenceClass === 'positive' ? 'difference-positive' : 'difference-negative');
        }
    }

    /**
     * Ajoute une mission à une date spécifique
     */
    addMissionToDate(date) {
        this.openMissionModal(null, date);
    }

    /**
     * Affiche les détails d'une mission (mode lecture)
     */
    viewMissionDetails(missionId) {
        this.openMissionModal(missionId);
    }

    /**
     * Configure l'auto-complétion de l'établissement quand on sélectionne un tarif
     */
    setupRateSelectAutoComplete() {
        const rateSelect = document.getElementById('mission-rate');
        const establishmentInput = document.getElementById('mission-establishment');
        const startTimeInput = document.getElementById('mission-start-time');
        const endTimeInput = document.getElementById('mission-end-time');
        const hourlyRateInput = document.getElementById('mission-hourly-rate');
        const estimatedSalaryInput = document.getElementById('mission-estimated-salary');
        
        if (!rateSelect || !establishmentInput) return;

        // Retirer l'ancien event listener s'il existe
        const newRateSelect = rateSelect.cloneNode(true);
        rateSelect.parentNode.replaceChild(newRateSelect, rateSelect);
        
        // Recharger les options
        this.loadRateOptions(newRateSelect);

        newRateSelect.addEventListener('change', (e) => {
            const selectedRateId = e.target.value;
            if (selectedRateId) {
                const rate = this.dataManager.getRateById(selectedRateId);
                if (rate) {
                    // Auto-compléter l'établissement seulement si le champ est vide
                    if (rate.establishment && !establishmentInput.value.trim()) {
                        establishmentInput.value = rate.establishment;
                    }
                    
                    // Auto-compléter les horaires depuis le tarif
                    if (rate.startTime && startTimeInput) {
                        startTimeInput.value = rate.startTime;
                    }
                    if (rate.endTime && endTimeInput) {
                        endTimeInput.value = rate.endTime;
                    }
                    
                    // Auto-compléter le tarif horaire et le salaire estimé (arrondis à 2 décimales)
                    if (rate.hourlyRate && hourlyRateInput) {
                        hourlyRateInput.value = this.round2(rate.hourlyRate);
                    }
                    if (rate.salary && estimatedSalaryInput) {
                        estimatedSalaryInput.value = this.round2(rate.salary);
                    }
                }
            }
        });
    }

    /**
     * Ouvre la modale pour ajouter/modifier une mission
     */
    openMissionModal(missionId = null, defaultDate = null) {
        const modal = document.getElementById('mission-modal');
        const form = document.getElementById('mission-form');
        const title = document.getElementById('mission-modal-title');
        const rateSelect = document.getElementById('mission-rate');
        const deleteBtn = document.getElementById('delete-mission');
        
        if (!modal || !form) return;

        // Réinitialiser le formulaire
        form.reset();
        this.currentEditingMission = missionId;

        // Nettoyer la suggestion de salaire réel (sera réaffichée si pertinent)
        const suggestionEl = document.getElementById('real-salary-suggestion');
        if (suggestionEl) {
            suggestionEl.style.display = 'none';
            suggestionEl.textContent = '';
        }

        // Charger les options de tarifs
        this.loadRateOptions(rateSelect);
        
        // Charger les établissements existants
        this.loadEstablishmentsList('mission-establishments-list');

        // Ajouter l'événement pour l'auto-complétion de l'établissement
        this.setupRateSelectAutoComplete();

        if (missionId) {
            // Mode édition/visualisation
            const mission = this.dataManager.getMissionById(missionId);
            if (mission) {
                title.textContent = 'Détails de la mission';
                document.getElementById('mission-date').value = mission.date;
                document.getElementById('mission-rate').value = mission.rateId;
                document.getElementById('mission-establishment').value = mission.establishment || '';
                document.getElementById('mission-service').value = mission.service || '';
                document.getElementById('mission-status').value = mission.status;
                document.getElementById('mission-notes').value = mission.notes || '';
                document.getElementById('mission-real-gross').value = mission.realGrossSalary || '';
                document.getElementById('mission-real-net').value = mission.realNetSalary || '';
                document.getElementById('mission-skip-real-salary').checked = !!mission.skipRealSalary;
                document.getElementById('mission-start-time').value = mission.startTime || '';
                document.getElementById('mission-end-time').value = mission.endTime || '';

                // Appliquer l'état désactivé des champs si le salaire est ignoré
                this.applySkipRealSalaryState();

                // Si le salaire réel est vide, pré-remplir depuis la mission réalisée
                // du même type la plus proche en date (à vérifier avant d'enregistrer).
                this.prefillRealSalaryFromSimilar(mission);
                
                // Pré-remplir les tarifs estimés (depuis la mission ou depuis le tarif), arrondis à 2 décimales
                const rate = this.dataManager.getRateById(mission.rateId);
                if (mission.hourlyRate !== undefined) {
                    document.getElementById('mission-hourly-rate').value = this.round2(mission.hourlyRate);
                } else if (rate && rate.hourlyRate) {
                    document.getElementById('mission-hourly-rate').value = this.round2(rate.hourlyRate);
                }

                if (mission.estimatedSalary !== undefined) {
                    document.getElementById('mission-estimated-salary').value = this.round2(mission.estimatedSalary);
                } else if (rate && rate.salary) {
                    document.getElementById('mission-estimated-salary').value = this.round2(rate.salary);
                }
                
                // Afficher le bouton supprimer
                if (deleteBtn) {
                    deleteBtn.style.display = 'block';
                }

                // État par défaut des accordéons selon le statut
                this.applyAccordionDefaults(mission.status);
            }
        } else {
            // Mode création
            title.textContent = 'Ajouter une mission';
            if (defaultDate) {
                document.getElementById('mission-date').value = defaultDate;
            }

            // Masquer le bouton supprimer
            if (deleteBtn) {
                deleteBtn.style.display = 'none';
            }

            // Nouvelle mission : tous les accordéons repliés
            this.applyAccordionDefaults('planned');
        }

        this.showModal('mission-modal');

        // Si la mission est "Planifiée", on descend automatiquement au champ Statut
        // car le plus souvent on rouvre la mission pour en changer le statut.
        if (missionId) {
            const mission = this.dataManager.getMissionById(missionId);
            if (mission && mission.status === 'planned') {
                const statusField = document.getElementById('mission-status');
                if (statusField) {
                    // Petit délai pour laisser la modale s'afficher avant de défiler
                    setTimeout(() => {
                        statusField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        statusField.focus();
                    }, 150);
                }
            }
        }
    }

    /**
     * Gère la suppression d'une mission depuis la modale
     */
    handleMissionDelete() {
        if (!this.currentEditingMission) return;
        
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette mission ?')) {
            return;
        }

        const success = this.dataManager.deleteMission(this.currentEditingMission);
        if (success) {
            this.showNotification('Mission supprimée avec succès', 'success');
            this.closeModal('mission-modal');
            this.loadPlanning();
            if (this.currentSection === 'dashboard') {
                this.loadDashboard();
            }
        } else {
            this.showNotification('Erreur lors de la suppression', 'error');
        }
    }

    /**
     * Charge les options de tarifs dans le select
     */
    loadRateOptions(selectElement) {
        if (!selectElement) return;

        const rates = this.dataManager.getRates()
            .slice()
            .sort((a, b) => (a.acronym || '').localeCompare(b.acronym || '', 'fr', { sensitivity: 'base' }));
        selectElement.innerHTML = '<option value="">Sélectionner un type</option>';

        rates.forEach(rate => {
            const option = document.createElement('option');
            option.value = rate.id;
            
            if (rate.hours === 0) {
                // Indemnité
                option.textContent = `${rate.acronym} - Indemnité - ${this.salaryManager.formatCurrency(rate.salary)}`;
            } else {
                // Mission normale
                option.textContent = `${rate.acronym} - ${rate.hours}h - ${this.salaryManager.formatCurrency(rate.salary)}`;
            }
            
            selectElement.appendChild(option);
        });
    }

    /**
     * Charge la liste des établissements dans un datalist
     */
    loadEstablishmentsList(datalistId) {
        const datalist = document.getElementById(datalistId);
        if (!datalist) return;

        const establishments = this.dataManager.getEstablishments();
        datalist.innerHTML = '';
        
        establishments.forEach(establishment => {
            const option = document.createElement('option');
            option.value = establishment;
            datalist.appendChild(option);
        });
    }

    /**
     * Gère la soumission du formulaire de mission
     */
    handleMissionSubmit(e) {
        e.preventDefault();
        
        const missionData = {
            date: document.getElementById('mission-date').value,
            rateId: document.getElementById('mission-rate').value,
            establishment: document.getElementById('mission-establishment').value,
            service: document.getElementById('mission-service').value,
            status: document.getElementById('mission-status').value,
            notes: document.getElementById('mission-notes').value,
            hourlyRate: parseFloat(document.getElementById('mission-hourly-rate').value) || null,
            estimatedSalary: parseFloat(document.getElementById('mission-estimated-salary').value) || null,
            realGrossSalary: parseFloat(document.getElementById('mission-real-gross').value) || null,
            realNetSalary: parseFloat(document.getElementById('mission-real-net').value) || null,
            skipRealSalary: document.getElementById('mission-skip-real-salary').checked,
            startTime: document.getElementById('mission-start-time').value || null,
            endTime: document.getElementById('mission-end-time').value || null
        };

        // Validation
        const validation = this.dataManager.validateMission(missionData);
        if (!validation.isValid) {
            this.showNotification(validation.errors.join('<br>'), 'error');
            return;
        }

        // Validation de la date
        const dateValidation = this.salaryManager.validateMissionDate(
            missionData.date, 
            this.currentEditingMission
        );
        
        if (dateValidation.warnings.length > 0) {
            const proceed = confirm(
                `Attention :\n${dateValidation.warnings.join('\n')}\n\nVoulez-vous continuer ?`
            );
            if (!proceed) return;
        }

        // Sauvegarde
        let success = false;
        if (this.currentEditingMission) {
            success = this.dataManager.updateMission(this.currentEditingMission, missionData);
        } else {
            success = this.dataManager.addMission(missionData);
        }

        if (success) {
            this.showNotification(
                this.currentEditingMission ? 'Mission modifiée avec succès' : 'Mission ajoutée avec succès',
                'success'
            );
            this.closeModal('mission-modal');
            this.loadPlanning();
            if (this.currentSection === 'dashboard') {
                this.loadDashboard();
            }
        } else {
            this.showNotification('Erreur lors de la sauvegarde', 'error');
        }
    }

    /**
     * Modifie une mission
     */
    editMission(missionId) {
        this.openMissionModal(missionId);
    }

    /**
     * Supprime une mission
     */
    deleteMission(missionId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette mission ?')) {
            return;
        }

        const success = this.dataManager.deleteMission(missionId);
        if (success) {
            this.showNotification('Mission supprimée avec succès', 'success');
            this.loadPlanning();
            if (this.currentSection === 'dashboard') {
                this.loadDashboard();
            }
        } else {
            this.showNotification('Erreur lors de la suppression', 'error');
        }
    }

    /**
     * SAUVEGARDE ET RESTAURATION
     */
    loadBackup() {
        const storageInfo = this.dataManager.getStorageInfo();
        console.log('Informations de stockage:', storageInfo);
        
        // Mettre à jour le statut Google Drive
        this.updateDriveSyncStatus();
    }

    /**
     * Exporte les missions vers Google Calendar (fichier ICS)
     */
    exportToCalendar() {
        try {
            const missions = this.dataManager.getMissions();
            
            if (missions.length === 0) {
                this.showNotification('Aucune mission à exporter', 'warning');
                return;
            }
            
            // Générer le fichier ICS (uniquement missions futures par défaut)
            const icsResult = this.salaryManager.generateICSFile(true);
            
            if (icsResult.exportedCount === 0 && icsResult.cancelledCount === 0) {
                this.showNotification(
                    '⚠️ Aucune mission future à exporter.<br>' +
                    'Toutes vos missions sont dans le passé.',
                    'warning'
                );
                return;
            }
            
            // Nom du fichier avec timestamp
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10);
            const filename = `missions-infirmier-${dateStr}.ics`;
            
            // Télécharger le fichier
            this.downloadFile(icsResult.content, filename, 'text/calendar');
            
            // Message de confirmation avec statistiques
            let message = `✅ <strong>${icsResult.exportedCount} mission(s) exportée(s) !</strong><br><br>`;
            
            if (icsResult.skippedPastCount > 0) {
                message += `ℹ️ ${icsResult.skippedPastCount} mission(s) passée(s) ignorée(s)<br><br>`;
            }

            if (icsResult.cancelledCount > 0) {
                message += `❌ ${icsResult.cancelledCount} mission(s) annulée(s) : seront retirées du calendrier au ré-import<br><br>`;
            }
            
            message += `📱 <strong>Sur mobile :</strong> Ouvrir le fichier pour l'ajouter à votre calendrier<br>` +
                      `💻 <strong>Sur PC :</strong> Google Calendar → ⚙️ Paramètres → Importer et exporter → Importer`;
            
            this.showNotification(message, 'success', 8000);
            
        } catch (error) {
            console.error('Erreur lors de l\'export ICS:', error);
            this.showNotification('Erreur lors de l\'export vers Calendar', 'error');
        }
    }

    /**
     * Exporte les données
     */
    exportData() {
        try {
            const data = this.dataManager.exportAllData();
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
            const filename = `nurse-salary-backup-${timestamp}.json`;
            
            this.downloadFile(data, filename, 'application/json');
            this.showNotification('Données exportées avec succès', 'success');
            
        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            this.showNotification('Erreur lors de l\'export', 'error');
        }
    }

    /**
     * Importe les données
     */
    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const success = this.dataManager.importAllData(e.target.result);
                
                if (success) {
                    this.showNotification('Données importées avec succès', 'success');
                    // Recharger l'interface
                    this.loadSectionContent(this.currentSection);
                } else {
                    this.showNotification('Erreur lors de l\'import: format de fichier invalide', 'error');
                }
                
            } catch (error) {
                console.error('Erreur lors de l\'import:', error);
                this.showNotification('Erreur lors de l\'import: fichier corrompu', 'error');
            }
        };
        
        reader.readAsText(file);
        // Réinitialiser l'input file
        event.target.value = '';
    }



    /**
     * Remet à zéro toutes les données
     */
    resetData() {
        const confirmation = prompt(
            'ATTENTION: Cette action supprimera TOUTES vos données de façon irréversible.\n\n' +
            'Tapez "SUPPRIMER" en majuscules pour confirmer:'
        );
        
        if (confirmation === 'SUPPRIMER') {
            const success = this.dataManager.clearAllData();
            if (success) {
                this.showNotification('Toutes les données ont été supprimées', 'success');
                // Recharger l'interface
                this.loadSectionContent(this.currentSection);
            } else {
                this.showNotification('Erreur lors de la suppression', 'error');
            }
        }
    }

    /**
     * UTILITAIRES D'INTERFACE
     */

    /**
     * Met à jour automatiquement les missions confirmées dont la date est passée
     */
    autoUpdateMissionStatuses() {
        const result = this.dataManager.autoUpdatePastConfirmedMissions();
        
        // Si des missions ont été mises à jour, afficher une notification discrète
        if (result.success && result.updatedCount > 0) {
            console.log(`✅ ${result.updatedCount} mission(s) passée(s) au statut "Réalisée" automatiquement`);
            
            // Notification très discrète, uniquement visible dans la console
            // On ne notifie pas l'utilisateur pour ne pas le déranger
        }
    }

    /**
     * Affiche une modale
     */
    /**
     * Déclenche la sauvegarde d'un formulaire (comme "Enregistrer") depuis la croix.
     * Le handler de soumission ferme la modale en cas de succès.
     * Si des champs requis sont vides ou la validation échoue, la modale reste ouverte.
     */
    /**
     * Ouvre ou ferme un accordéon de la modale mission.
     */
    /**
     * Arrondit une valeur à 2 décimales pour l'affichage des tarifs estimés.
     * Retourne '' si la valeur n'est pas un nombre exploitable.
     */
    round2(value) {
        const n = parseFloat(value);
        if (!isFinite(n)) return '';
        return (Math.round(n * 100) / 100).toFixed(2);
    }

    /**
     * Indique si une date appartient à un mois antérieur au mois courant.
     */
    isPastMonth(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        const now = new Date();
        return d.getFullYear() < now.getFullYear() ||
               (d.getFullYear() === now.getFullYear() && d.getMonth() < now.getMonth());
    }

    /**
     * Propose (via un bouton) de reprendre le salaire réel de la mission
     * réalisée du MÊME type (rateId) la plus proche en date. Les valeurs ne
     * sont appliquées QUE si l'utilisateur clique sur le bouton (pas d'auto-save).
     */
    prefillRealSalaryFromSimilar(mission) {
        const grossInput = document.getElementById('mission-real-gross');
        const netInput = document.getElementById('mission-real-net');
        const suggestionEl = document.getElementById('real-salary-suggestion');
        if (!grossInput || !netInput || !suggestionEl) return;

        suggestionEl.style.display = 'none';
        suggestionEl.innerHTML = '';

        // Pas de suggestion si le salaire est ignoré ou déjà renseigné
        const skip = document.getElementById('mission-skip-real-salary');
        if (skip && skip.checked) return;
        if (grossInput.value !== '' || netInput.value !== '') return;

        const refTime = new Date(mission.date + 'T00:00:00').getTime();

        const candidates = this.dataManager.getMissions().filter(m =>
            m.id !== mission.id &&
            m.rateId === mission.rateId &&
            m.status === 'completed' &&
            !m.skipRealSalary &&
            m.realGrossSalary != null && m.realGrossSalary !== '' &&
            m.realNetSalary != null && m.realNetSalary !== ''
        );

        if (candidates.length === 0) return;

        // La plus proche en date (écart minimal), puis la plus récente en cas d'égalité
        candidates.sort((a, b) => {
            const da = Math.abs(new Date(a.date + 'T00:00:00').getTime() - refTime);
            const db = Math.abs(new Date(b.date + 'T00:00:00').getTime() - refTime);
            if (da !== db) return da - db;
            return b.date.localeCompare(a.date);
        });

        const ref = candidates[0];
        const gross = this.round2(ref.realGrossSalary);
        const net = this.round2(ref.realNetSalary);
        const d = new Date(ref.date + 'T00:00:00').toLocaleDateString('fr-FR');

        suggestionEl.innerHTML = `
            <button type="button" id="apply-last-salary" class="btn-suggestion">
                <i class="fas fa-wand-magic-sparkles"></i> Reprendre la dernière : brut ${gross}€ / net ${net}€
            </button>
            <span class="suggestion-note">mission du ${d}</span>
        `;
        suggestionEl.style.display = 'block';

        const applyBtn = document.getElementById('apply-last-salary');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                grossInput.value = ref.realGrossSalary;
                netInput.value = ref.realNetSalary;
                suggestionEl.style.display = 'none';
            });
        }
    }

    /**
     * Active/désactive les champs Salaire réel selon la case "ne pas saisir".
     */
    applySkipRealSalaryState() {
        const skip = document.getElementById('mission-skip-real-salary');
        const grossInput = document.getElementById('mission-real-gross');
        const netInput = document.getElementById('mission-real-net');
        const suggestionEl = document.getElementById('real-salary-suggestion');
        if (!skip || !grossInput || !netInput) return;

        if (skip.checked) {
            grossInput.value = '';
            netInput.value = '';
            grossInput.disabled = true;
            netInput.disabled = true;
            if (suggestionEl) { suggestionEl.style.display = 'none'; suggestionEl.innerHTML = ''; }
        } else {
            grossInput.disabled = false;
            netInput.disabled = false;
        }
    }

    setAccordionOpen(name, open) {
        const accordion = document.querySelector(`#mission-form .accordion[data-accordion="${name}"]`);
        if (accordion) {
            accordion.classList.toggle('open', open);
        }
    }

    /**
     * Applique l'état par défaut des accordéons selon le statut de la mission.
     * Tous repliés, sauf "Tarifs estimés" qui se déplie quand la mission est Réalisée.
     */
    applyAccordionDefaults(status) {
        this.setAccordionOpen('horaires', false);
        this.setAccordionOpen('etablissement', false);
        this.setAccordionOpen('service', false);
        this.setAccordionOpen('tarifs', false);
        this.setAccordionOpen('salaire-reel', status === 'completed');
    }

    saveAndCloseForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        // Si le formulaire est valide, on enregistre (le handler ferme la modale).
        // Sinon (ex. nouvelle mission vide), on ferme simplement sans enregistrer
        // pour que la croix permette toujours de quitter la modale.
        if (form.checkValidity()) {
            if (typeof form.requestSubmit === 'function') {
                form.requestSubmit();
            } else {
                form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
        } else {
            const modal = form.closest('.modal');
            if (modal) {
                this.closeModal(modal.id);
            }
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';

            // Toujours réinitialiser le défilement en haut à l'ouverture
            // (un défilement spécifique, ex. vers le Statut, peut être appliqué ensuite)
            const content = modal.querySelector('.modal-content');
            if (content) {
                content.scrollTop = 0;
            }
        }
    }

    /**
     * Ferme une modale
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            
            // Réinitialiser les variables d'édition
            if (modalId === 'rate-modal') {
                this.currentEditingRate = null;
            } else if (modalId === 'mission-modal') {
                this.currentEditingMission = null;
            }
        }
    }

    /**
     * Affiche une notification
     */
    showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notifications');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = message;

        container.appendChild(notification);

        // Supprimer automatiquement la notification
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);
    }

    /**
     * Met à jour un élément du DOM
     */
    updateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    /**
     * Télécharge un fichier
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }
}

// Initialiser l'application quand tout est prêt
window.app = new NurseSalaryApp();