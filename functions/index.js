const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const nodemailer = require("nodemailer");

admin.initializeApp();
const db = admin.firestore();

// --- Configuration ---
// Configuração do E-mail (Mudar aqui ou usar Environment Variables)
const EMAIL_USER = "fidelitipro@gmail.com";
const EMAIL_PASS = "sua_senha_de_app_aqui";

// Create Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
});

// Strict Mode: Now FALSE. We allow "nameless" automated signups.
const REQUIRE_NAME_FOR_NEW_USERS = false;

/**
 * API to Add Points
 * Endpoint: POST /addPoints
 * Body: { "apiKey": "...", "cpf": "123...", "value": 100.50, "name": "Optional" }
 */
exports.addPoints = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        try {
            if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

            const { apiKey, cpf, value, name } = req.body;
            if (!apiKey || !cpf || !value) return res.status(400).json({ error: "Missing fields" });

            // 2. Find Store
            const snapshot = await db.collection('stores').where('apiKey', '==', apiKey).limit(1).get();
            if (snapshot.empty) return res.status(401).json({ error: "Invalid API Key" });

            const storeDoc = snapshot.docs[0];
            const storeData = storeDoc.data();
            const storeId = storeDoc.id;

            // 3. Payment Guard & Warning System
            const status = storeData.subscription?.status;
            const expiryDate = storeData.subscription?.expiryDate || 0;
            const now = Date.now();

            // Calculate Overdue
            // If expiry is in future, overdue is negative. If past, positive.
            const msOverdue = now - expiryDate;
            const daysOverdue = Math.floor(msOverdue / (1000 * 60 * 60 * 24));

            let isBlocked = false;
            let warningMessage = null;

            if (status !== 'active' && status !== 'trial' && expiryDate > 0) {
                if (daysOverdue > 5) {
                    isBlocked = true;
                } else if (daysOverdue >= 0 && daysOverdue <= 5) {
                    // Warning Zone (0 to 5 days overdue)
                    const daysRemaining = 5 - daysOverdue;
                    warningMessage = `Atenção: Sua assinatura venceu. A API será bloqueada em ${daysRemaining} dias. Renove agora.`;

                    // Trigger Email Warning (Throttled to once per day per store to avoid spamming on every sale)
                    // Logic: Check 'lastWarningDate' in storeDoc. If not today, send email.
                    const lastWarning = storeData.lastWarningDate ? storeData.lastWarningDate.toDate() : null;
                    const today = new Date();

                    if (!lastWarning || lastWarning.getDate() !== today.getDate()) {
                        // Send Email (Mock/Placeholder for Trigger)
                        console.log(`[EMAIL TRIGGER] To: ${storeData.email}, Subject: AVISO DE BLOQUEIO - Faltam ${daysRemaining} dias`);

                        // In a real scenario with Firebase Extensions (Trigger Email), we would write to 'mail' collection:
                        /*
                        await db.collection('mail').add({
                            to: storeData.email,
                            message: {
                                subject: `⚠️ AVISO: A API do FidelitiPro vai parar em ${daysRemaining} dias!`,
                                text: `Olá ${storeData.name}, constamos que sua assinatura venceu.\n\nPara não interromper o lançamento de pontos automático, renove hoje.\n\nContagem regressiva: Faltam ${daysRemaining} dias.`
                            }
                        });
                        */

                        // Update lastWarningDate to prevent multiple emails today
                        await db.collection('stores').doc(storeId).update({
                            lastWarningDate: admin.firestore.Timestamp.now()
                        });
                    }
                }
            } else if (status !== 'active' && status !== 'trial' && expiryDate === 0) {
                // No credentials/expiry? Block immediately.
                isBlocked = true;
            }

            if (isBlocked) {
                return res.status(403).json({
                    error: "Service Suspended. Subscription expired > 5 days. Please renew immediately."
                });
            }

            // 4. Find or Create Customer
            const cleanCPF = cpf.replace(/\D/g, '');
            // Note: In the new architecture, we might look in root 'customers' or store-specific 'customers' subcollection/map
            // The current app uses storeData.customers[cpf], which is a nested Object (Map). 
            // Updating a nested map key using dot notation is supported in Firestore update().

            // Let's refetch the latest store data to be safe (we already have storeDoc)
            // But 'customers' is a large object in the document. 
            // Ideally we should move to subcollections, but let's respect current architecture: `store.customers` Map.

            const currentCustomers = storeData.customers || {};
            let customer = currentCustomers[cleanCPF];
            // let isNewCustomer = false; // No longer needed

            if (!customer) {
                // Auto-Register (Now always allowed)
                // isNewCustomer = true; // No longer needed
                customer = {
                    docId: db.collection('customers').doc().id,
                    name: name || `Cliente ${cleanCPF.slice(-4)}`, // Placeholder Example: "Cliente 8900"
                    points: 0,
                    history: []
                };
            } else {
                // Determine if we should update the name
                // Only update if current name is placeholder AND new name is provided
                if (name && customer.name && customer.name.startsWith("Cliente ")) {
                    customer.name = name;
                }
            }

            // 5. Calculate Points
            // Default: 1 point per Real unless configured otherwise
            const pointsToAdd = Math.floor(Number(value)); // Simplification matching user logic

            if (pointsToAdd <= 0) {
                return res.status(400).json({ error: "Value must result in positive points." });
            }

            // 6. Update Customer Object
            const newPoints = (customer.points || 0) + pointsToAdd;

            const historyEntry = {
                id: admin.firestore.Timestamp.now().toMillis().toString() + Math.random().toString(36).substr(2, 5),
                date: admin.firestore.Timestamp.now().toMillis(),
                type: 'add',
                amount: pointsToAdd,
                origin: 'api_pos' // Mark as coming from POS
            };

            // Update local object
            customer.points = newPoints;
            if (!customer.history) customer.history = [];
            customer.history.unshift(historyEntry); // Add to top

            // 7. Save to Firestore
            // We need to update the specific key in the map: `customers.12345678900`
            const updateField = `customers.${cleanCPF}`;

            await storesRef.doc(storeId).update({
                [updateField]: customer,
                lastApiUsage: admin.firestore.Timestamp.now()
            });

            // --- PRIZE CHECK & EMAIL TRIGGER (DISABLED PER USER REQUEST) ---
            /*
            const rewardGoal = storeData.rewardGoal || 10;
            const oldAvailable = Math.floor((customer.points - pointsToAdd) / rewardGoal);
            const newAvailable = Math.floor(newPoints / rewardGoal);

            if (newAvailable > oldAvailable && customer.email && customer.emailEnabled) {
                // Customer won a NEW prize!
                const mailOptions = {
                    from: `"FidelitiPro" <${EMAIL_USER}>`,
                    to: customer.email,
                    subject: `🎁 PARABÉNS! Você ganhou um prêmio na ${storeData.name}!`,
                    html: `...`
                };

                try {
                    await transporter.sendMail(mailOptions);
                    console.log(`[EMAIL SENT] Prize alert sent to ${customer.email}`);
                } catch (emailErr) {
                    console.error("[EMAIL ERROR] Failed to send prize alert:", emailErr);
                }
            }
            */
            // -----------------------------------

            // Optional: If you maintain a root 'customers' collection mirror, update it here too.
            // For now, adhering to main `store.customers` pattern.

            return res.status(200).json({
                success: true,
                message: "Points added successfully.",
                data: {
                    newBalance: newPoints,
                    added: pointsToAdd,
                    customerName: customer.name
                }
            });

        } catch (error) {
            console.error("Error in addPoints:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });
});

/**
 * Callable Function: Generate a New API Key
 * Call from Frontend: const result = await httpsCallable(functions, 'generateApiKey')();
 */
exports.generateApiKey = functions.https.onCall(async (data, context) => {
    // 1. Auth Check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    const uid = context.auth.uid;
    const storeRef = db.collection('stores').doc(uid);

    // 2. Generate Random Key
    const newApiKey = "fp_live_" + crypto.randomUUID().replace(/-/g, '') + crypto.randomBytes(4).toString('hex');

    // 3. Save to Store Doc
    await storeRef.update({
        apiKey: newApiKey,
        integrationEnabled: true
    });

    return { apiKey: newApiKey };
});

/**
 * Callable Function: Revoke API Key
 */
exports.revokeApiKey = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const uid = context.auth.uid;

    await db.collection('stores').doc(uid).update({
        apiKey: admin.firestore.FieldValue.delete(), // Remove field
        integrationEnabled: false
    });

    return { success: true };
});

// Polyfill for Node 18 crypto if needed (usually built-in)
const crypto = require('crypto');
