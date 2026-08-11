/*
    web-crypto.js || DimensionReset

    Encrypts plaintext using AES-GCM and can
    also decrypt strings using the same api.
*/

// retrieves an existing key or generates and stores a new AES-GCM key
export async function getOrCreateKey() {
    const stored = await chrome.storage.local.get(['appCryptoKey']);
    if (stored.appCryptoKey) {
        return await crypto.subtle.importKey(
            'jwk',
            stored.appCryptoKey,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
    }

    // generate a new AES-256-GCM key
    const newKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );

    // export JWK format so it can be stored in extension storage
    const exportedKey = await crypto.subtle.exportKey('jwk', newKey);
    await chrome.storage.local.set({ appCryptoKey: exportedKey });

    return newKey;
}

// encrypts plaintext string using AES-GCM with a random 12-byte IV
export async function encryptData(plaintext, key) {
    if (!plaintext) return null;
    
    const encoder = new TextEncoder();
    const encodedText = encoder.encode(plaintext);
    const iv = crypto.getRandomValues(new Uint8Array(12)); // AES-GCM standard IV length

    const ciphertextBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encodedText
    );

    return {
        ciphertext: Array.from(new Uint8Array(ciphertextBuffer)),
        iv: Array.from(iv)
    };
}

// decrypts ciphertext object back to plaintext string
export async function decryptData(encryptedObj, key) {
    if (!encryptedObj || !encryptedObj.ciphertext || !encryptedObj.iv) return null;

    try {
        const ciphertextBuffer = new Uint8Array(encryptedObj.ciphertext).buffer;
        const iv = new Uint8Array(encryptedObj.iv);

        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            ciphertextBuffer
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    } catch (err) {
        console.error(`[${fileName}] Decryption failed:`, err);
        return null;
    }
}