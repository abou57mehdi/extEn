# Conversation Log & Summary Chrome Extension

Cette extension Chrome capture automatiquement les conversations avec des agents IA (ChatGPT, Claude, Bard, Gemini) et génère des résumés.

## Fonctionnalités

- Capture automatique des conversations sur les plateformes d'IA supportées
- Génération de résumés avec un microservice Python utilisant la bibliothèque transformers
- Téléchargement des conversations au format JSON
- Interface utilisateur moderne et intuitive
- Stockage local des conversations
- Détection automatique des changements de conversation

## Installation

1. Clonez ce dépôt :

```bash
git clone [URL_DU_REPO]
cd chrome-extension
```

2. Installez les dépendances :

```bash
npm install
```

3. Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```
MONGODB_URL=mongodb+srv://aboum77:Mehdi%40500@cluster0.smdgbe0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
HUGGINGFACE_API_KEY=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
```

4. Construisez l'extension :

```bash
npm run build
```

5. Chargez l'extension dans Chrome :
   - Ouvrez Chrome et allez à `chrome://extensions/`
   - Activez le "Mode développeur"
   - Cliquez sur "Charger l'extension non empaquetée"
   - Sélectionnez le dossier `build` du projet

## Utilisation

1. Visitez une des plateformes d'IA supportées :

   - chat.openai.com (ChatGPT)
   - claude.ai (Claude)
   - bard.google.com (Bard)
   - gemini.google.com (Gemini)

2. L'extension capturera automatiquement la conversation.

3. Cliquez sur l'icône de l'extension pour :
   - Voir le nombre de messages capturés
   - Générer un résumé de la conversation
   - Télécharger la conversation
   - Effacer la conversation actuelle

## Structure du projet

```
chrome-extension/
├── build/                # Fichiers de l'extension compilée
├── public/               # Fichiers statiques
├── src/                  # Code source
├── server/               # API backend Node.js
├── python-summarizer/    # Microservice Python pour la génération de résumés
├── content.js            # Script d'injection pour la capture
├── manifest.json         # Configuration de l'extension
├── docker-compose.yml    # Configuration Docker Compose
└── package.json          # Dépendances et scripts
```

## Développement

### Extension et Backend Node.js

Pour développer l'extension :

1. Lancez le serveur de développement :

```bash
npm run dev
```

2. Les modifications seront automatiquement rechargées dans Chrome.

3. Pour déboguer :
   - Ouvrez les outils de développement dans Chrome
   - Allez dans l'onglet "Sources"
   - Cherchez dans la section "Content Scripts"

### Microservice Python

Pour développer le microservice Python :

1. Naviguez vers le répertoire python-summarizer :

```bash
cd python-summarizer
```

2. Créez un environnement virtuel et activez-le :

```bash
python -m venv venv
# Sur Windows
venv\Scripts\activate
# Sur macOS/Linux
source venv/bin/activate
```

3. Installez les dépendances :

```bash
pip install -r requirements.txt
```

4. Lancez l'application Flask :

```bash
python app.py
```

Le microservice Python sera disponible à l'adresse http://localhost:5000

### Exécution avec Docker Compose

Pour exécuter les deux services ensemble avec Docker Compose :

```bash
docker-compose up --build
```

Cela démarrera à la fois le backend Node.js et le microservice Python dans des conteneurs.

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

- Signaler des bugs
- Proposer des améliorations
- Soumettre des pull requests

## Licence

MIT
