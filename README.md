# Grey Sloan RH — Application de gestion des soignants

Application web Angular interfacée avec un serveur **FHIR R4 (HAPI)** pour la gestion des ressources humaines d'un établissement de santé fictif inspiré de la série *Grey's Anatomy*.

Développée dans le cadre du projet **ISIS FHIR Interop** — ISIS Ingénierie, 2025-2026.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | Angular 18 (standalone components, Signals) |
| Style | SCSS custom + Bootstrap Icons |
| Serveur FHIR | HAPI FHIR R4 — `fhir.chl.connected-health.fr` |
| Conteneurisation | Docker + Nginx |
| Profils FHIR | IG maison (Soignant, SoignantRole) — ANS TRE-R38, TRE-G15 |

---

## Fonctionnalités

### 👨‍⚕️ Gestion des soignants (`/soignants`)

- **Liste paginée** de tous les praticiens avec statistiques (actifs, rôles assignés, multi-rôles, inactifs)
- **Recherche en temps réel** par nom, prénom ou numéro RPPS
- **Filtres** par statut (actif/inactif) et par spécialité/qualification
- **Suppression** avec confirmation

Chaque soignant affiche ses **rôles** (PractitionerRole) en panneau dépliable, avec possibilité de supprimer un rôle individuel.

### ➕ Recrutement d'un soignant (`/recrutement`)

Formulaire complet de création/modification d'un praticien conforme au profil `Soignant` de l'IG :

- **Identité** : numéro RPPS (11 chiffres), titre, prénom, nom, genre, date de naissance
- **Coordonnées** : téléphone et/ou email *(au moins un requis — contrainte `telecom 1..*` de l'IG)*
- **Adresse professionnelle** : rue, ville, code postal, pays
- **Qualification(s)** : intitulé, date d'obtention, établissement — ajout dynamique de plusieurs qualifications
- **Langues parlées** : sélection par chips cliquables (BCP47)
- **Statut** actif/inactif

Le JSON envoyé est validé contre le profil FHIR `Soignant` et inclut la narrative `text` (dom-6).

### 🗂️ Attribution de rôles (modal intégré)

Depuis la liste des soignants, clic sur l'icône **valise** ou **+ Ajouter un rôle** :

- Sélection de l'**organisation / établissement**
- **Profession** : Médecin (TRE-G15, code 10) — fixe
- **Spécialité ordinale** (TRE-R38) : liste complète avec codes officiels ANS (SM54, SM05, SM04, SM09, SM11…)
- **Jours disponibles** : cases Lun → Dim
- **Plage horaire** : heure de début / fin
- **Statut** actif/inactif

Crée une ressource `PractitionerRole` FHIR conforme au profil `SoignantRole` de l'IG.

### 📅 Rendez-vous par RPPS (`/rdv`)

- Recherche d'un praticien par son **numéro RPPS**
- Affichage de ses **rendez-vous** (ressources `Appointment` FHIR) pour la semaine en cours
- Navigation semaine par semaine (← →)
- Affichage : patient, type de consultation, lieu, statut (confirmé / en attente / annulé)

---

## Architecture FHIR

```
Practitioner  ←──────────────  PractitionerRole
   (Soignant)                      (SoignantRole)
       │                                 │
       │ participant                     │ actor
       └─────────────┬───────────────────┘
                     ▼
               Appointment
```

Les ressources sont conformes aux profils définis dans l'IG `ISIS_FHIR_Interop` et utilisent les terminologies ANS :
- **TRE-G15** pour la profession (Médecin = code 10)
- **TRE-R38** pour la spécialité ordinale
- **BCP47** pour les langues (`urn:ietf:bcp:47`)
- **RPPS** : `urn:oid:1.2.250.1.71.4.2.1`

---

## Lancer l'application

```bash
docker compose up -d --build
```

Accessible sur [http://localhost:4200](http://localhost:4200)

---

*Projet réalisé par l'équipe ISIS Ingénierie — 2025-2026*
