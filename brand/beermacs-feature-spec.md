# Beermacs — Feature Specification

Mobile application for organizing and running beer pong tournaments.
The app has two sides: a **User side** (players) and an **Admin side** (tournament organizers).
Section 4 describes the tournament engine — the automatic behaviour both sides depend on.
---

## 1. Accounts and registration

| ID  | Feature                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| G-1 | On sign-up, every user provides an **email address** and a **phone number**.                                                             |
| G-2 | Registration data (email, phone) is stored and made accessible to admins, so that they can contact players again for future tournaments. |

---

## 2. User side

### 2.1 Joining a tournament and forming a team

| ID  | Feature                                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------- |
| U-1 | **Every player joins the tournament individually**, using a **numeric code**, a **QR code** or a **link** provided by the admin.  |
| U-2 | Once inside the tournament, a player can **create their own team** and give it a name.                                            |
| U-3 | The player who created the team can invite their teammate(s) to join it, through a **numeric code**, a **QR code** or a **link**. |
| U-4 | The number of players per team is not fixed by the app: it is defined by the admin when the tournament is created (see A-1).      |

### 2.2 Tournament information

| ID  | Feature                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- |
| U-5 | The user can see **who they play against** and **when**.                                                                               |
| U-6 | The user can see **which table** their match is assigned to (tables are numbered by the admin before the tournament starts — see A-4). |
| U-7 | The user can see the **full bracket / standings**, which is visible to everyone and updates as the tournament progresses (see E-5).    |

### 2.3 Match chat

| ID   | Feature                                                                                              |
| ---- | ---------------------------------------------------------------------------------------------------- |
| U-8  | Each match has its own **internal chat**, including the user, their teammate(s) and their opponents. |
| U-9  | Chat is available only if the admin has enabled it for that tournament (see A-2).                    |
| U-10 | Admins can read **every match chat** and post messages in any of them.                               |

### 2.4 Reporting results

| ID   | Feature                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------ |
| U-11 | At the end of each match, **each team reports the winner** through the app.                                  |
| U-12 | The result is recorded only when **both teams confirm the same winner**. Until then the match stays pending. |
| U-13 | If the two teams declare **different winners**, the **admin decides** the result (see A-11).                 |
| U-14 | Once the result is confirmed, the **tournament is updated automatically** (bracket and next matches).        |

### 2.5 Push notifications

| ID   | Feature                                                                                                                          |
| ---- | -------------------------------------------------------------------------------------------------------------------------------- |
| U-15 | Push notification when a team **has to play** or is **about to play**, including the **table number** and the **opposing team**. |
| U-16 | Push notification for every new message in a private/match chat.                                                                 |
| U-17 | Push notification for messages sent by an admin to the user.                                                                     |

---

## 3. Admin side

### 3.1 Creating a tournament

| ID  | Feature                                                                                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-1 | Create a tournament and set the **number of players per team**.                                                                                                                                                                                                     |
| A-2 | Enable or disable the **chat** for the tournament.                                                                                                                                                                                                                  |
| A-3 | Set the **number of tables** available for play.                                                                                                                                                                                                                    |
| A-4 | Assign a **number to each table**, before the tournament starts.                                                                                                                                                                                                    |
| A-5 | Choose the **tournament format**. The standard case is **single elimination**, two teams head-to-head, but the app must also support other structures (e.g. group stage + knockout, triangular). The admin must be free to organize the tournament as they see fit. |
| A-6 | **Change the format while the tournament is running**, without having to recreate it.                                                                                                                                                                               |

### 3.2 Teams and players

| ID   | Feature                                                                                                                                        |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| A-7  | **Add teams after the tournament has already started** — this is a core requirement, the roster must not be locked at kick-off.                |
| A-8  | There is **no fixed cut-off** for adding teams: the admin decides case by case, at any point in the tournament.                                |
| A-9  | **Re-admit eliminated teams** (repêchage) at any point, including when the number of teams is even and no repêchage is required (see E-8).     |
| A-10 | For every repêchage, choose the **selection mode**: either let the app pick the team **automatically and at random**, or pick it **manually**. |
| A-11 | Allow a team to play with **more or fewer members** than the number configured in A-1, at the admin's discretion.                              |

### 3.3 Match results

| ID   | Feature                                                                                                                                               |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-12 | **Set the result of a match** when the two teams declare different winners. The admin's decision overrides the teams' reports and unblocks the match. |

### 3.4 Rounds, pairings and tables

| ID   | Feature                                                                                                                                                                                                                                      |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-13 | **Open a round.** Starting a round is an explicit admin action: the app schedules matches for a round only once the admin has opened it. The purpose is to prevent newly added teams from being sent to play before the admin wants them to. |
| A-14 | Keep **several rounds open at the same time**: matches of a later round can be played while the previous round is still open.                                                                                                                |
| A-15 | **Suspend and resume the automatic scheduling of matches** at any time, at the admin's discretion.                                                                                                                                           |
| A-16 | **Change any pairing manually**, overriding the random matchmaking (see E-1).                                                                                                                                                                |
| A-17 | Receive a **notification for every automatic table assignment** (see E-4).                                                                                                                                                                   |

### 3.5 Communication

| ID   | Feature                                                                                                     |
| ---- | ----------------------------------------------------------------------------------------------------------- |
| A-18 | Send messages to a **single team**, a **single person**, or a **group of teams**.                           |
| A-19 | Send a message to **anyone in the app**; all admin messages trigger a push notification for the recipients. |
| A-20 | Access and write in **any match chat** of the tournament.                                                   |

### 3.6 Player data

| ID   | Feature                                                                                                                    |
| ---- | -------------------------------------------------------------------------------------------------------------------------- |
| A-21 | Access the **email addresses and phone numbers** of registered users, in order to re-contact them for the next tournament. |

---

## 4. Tournament engine (automatic behaviour)

| ID  | Behaviour                                                                                                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E-1 | Teams are **paired randomly**. The admin can override any pairing (A-15).                                                                                                                                                                                                             |
| E-2 | **Tables are assigned automatically, based on which tables are free.** At the start of a round the assignment is therefore random.                                                                                                                                                    |
| E-3 | As soon as a table frees up, the app takes the teams that **have not played yet** in the open round(s), pairs them and assigns them to that table automatically.                                                                                                                      |
| E-4 | Every automatic assignment sends a message to **both teams** (they have to play, on which table, against whom) and to the **admin**.                                                                                                                                                  |
| E-5 | The **bracket is public** and updates progressively as matches are assigned and results are confirmed.                                                                                                                                                                                |
| E-6 | A team added after the tournament has started enters the bracket at the **lowest round currently open**. Example: if round 1 and round 2 are both in progress, the new team is entered in round 1; if only round 2 is open, it is entered in round 2.                                 |
| E-7 | **Before the admin opens round 1** — the only situation in which no round is open — teams are placed in the bracket and counted as belonging to **round 1**, even though the round has not been formally started. No match is scheduled until the admin opens the round.              |
| E-8 | When the number of teams in a round is **odd**, a **repêchage** is run among the teams that have lost, so that the odd team gets an opponent. The re-admitted team is chosen either **automatically at random** or **manually by the admin**, depending on the mode selected in A-10. |
