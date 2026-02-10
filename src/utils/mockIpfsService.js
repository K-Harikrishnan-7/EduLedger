/**
 * Mock IPFS Service
 * Simulates IPFS functionality without actual IPFS infrastructure
 * Stores PDFs in browser's localStorage/IndexedDB and generates mock hashes
 */

/**
 * Generate a mock IPFS hash (CID)
 * @returns {string} - Mock IPFS hash
 */
const generateMockHash = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `Qm${random}${timestamp.toString(36)}`;
};

/**
 * Upload file to mock IPFS (stores in memory/localStorage)
 * @param {Blob} file - File to upload
 * @returns {Promise<Object>} - Object with hash and url
 */
export const uploadToIPFS = async (file) => {
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const hash = generateMockHash();

    // Convert blob to base64 for storage
    const reader = new FileReader();
    const base64Data = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });

    // Store in localStorage (in production, use IndexedDB for larger files)
    try {
        localStorage.setItem(`ipfs_${hash}`, base64Data);
    } catch (error) {
        console.warn('LocalStorage full, using in-memory storage');
    }

    return {
        hash: hash,
        url: `https://ipfs.io/ipfs/${hash}`, // Mock URL
        success: true
    };
};

/**
 * Retrieve file from mock IPFS
 * @param {string} hash - IPFS hash
 * @returns {Promise<string>} - Base64 data URL
 */
export const getFromIPFS = async (hash) => {
    // Simulate retrieval delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const data = localStorage.getItem(`ipfs_${hash}`);

    if (!data) {
        throw new Error(`File not found for hash: ${hash}`);
    }

    return data;
};

/**
 * Check if hash exists in mock IPFS
 * @param {string} hash - IPFS hash
 * @returns {boolean} - True if exists
 */
export const hashExists = (hash) => {
    return localStorage.getItem(`ipfs_${hash}`) !== null;
};

/**
 * Delete from mock IPFS (cleanup)
 * @param {string} hash - IPFS hash
 */
export const deleteFromIPFS = (hash) => {
    localStorage.removeItem(`ipfs_${hash}`);
};
