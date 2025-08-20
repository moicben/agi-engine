# Sessions Chrome persistantes (Puppeteer)

Ce dossier stocke des sessions Chrome persistantes au format JSON (cookies, localStorage, sessionStorage, URL de référence), générées et restaurées par les helpers existants sous tools/puppeteer.

Fichiers clés:
- default-session.json (créé au premier run du script de test)

Comment générer et réutiliser la session:
1) Générer/mettre à jour la session
   - Lancer le script assets/tests/puppeteer_session_test.js (node) après avoir défini éventuellement:
     - TEST_URL: URL cible à ouvrir pour initialiser la session (par défaut https://example.com)
     - HEADLESS=true|false: pour choisir le mode
   - Le script créera assets/chrome-session/default-session.json si absent, sinon il restaurera la session et prendra une capture d’écran.

2) Réutiliser dans votre code Puppeteer
   - Importer la session JSON puis appeler restoreSession(browser, session) en réutilisant launchBrowser() depuis tools/puppeteer/client.js.

Notes:
- Le script évite toute dépendance supplémentaire et réutilise au maximum tools/puppeteer (launchBrowser, saveSession, restoreSession, takeShot, attachLogging).
- Ajoutez d’autres sessions nommées si besoin (ex: checkout-session.json) et référencez-les dans vos workflows.

