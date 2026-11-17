/** Group E public surface (Stages 4, 17, 18; Stage 19 browser extension intentionally not built). */
export {onboardingFeature} from '../onboarding/onboarding-module.mjs';
export {JOURNEYS,startJourney,availability,stepsFor,getView,submit,skip,back,finish,progress,buildDocument,serializeDraft,restoreDraft} from '../onboarding/journeys.mjs';
export {pwaStatusFeature} from '../pwa-ui/pwa-status-module.mjs';
export {assessStorageHealth,collectStorageSignals,installState,connectivityMessage,backupReminder} from '../pwa-ui/status.mjs';
export {createUpdateManager} from '../pwa-ui/update-manager.mjs';
export {createPortablePackage,reviewPortablePackage,approvePortablePackage,createFeedbackBundle,findSecretPaths} from '../pwa-ui/portable.mjs';
export {createAnnouncer,focusHeading,rememberFocus,prefersReducedMotion} from '../accessibility/a11y.mjs';
export {auditAccessibility,tabReachability,MANUAL_REQUIRED} from '../accessibility/a11y-audit.mjs';
