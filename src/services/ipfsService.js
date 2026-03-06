// IPFS Service using Pinata
// Requires VITE_PINATA_JWT in your .env file

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY || 'https://gateway.pinata.cloud';

const PIN_JSON_URL = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
const PIN_FILE_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

/**
 * Upload a file (e.g. PDF) to IPFS via Pinata
 * @param {Blob|File} file
 * @param {string} fileName
 * @returns {{ success: boolean, ipfsHash?: string, gatewayUrl?: string, error?: string }}
 */
export const uploadFileToIPFS = async (file, fileName = 'marksheet.pdf') => {
    try {
        if (!PINATA_JWT) throw new Error('VITE_PINATA_JWT not set in .env');

        const formData = new FormData();
        const fileToUpload = file instanceof File ? file : new File([file], fileName, { type: 'application/pdf' });
        formData.append('file', fileToUpload);
        formData.append('pinataMetadata', JSON.stringify({ name: fileName }));

        const response = await fetch(PIN_FILE_URL, {
            method: 'POST',
            headers: { Authorization: `Bearer ${PINATA_JWT}` },
            body: formData,
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.details || 'Pinata upload failed');
        }

        const data = await response.json();
        return {
            success: true,
            ipfsHash: data.IpfsHash,
            ipfsUrl: `ipfs://${data.IpfsHash}`,
            gatewayUrl: `${PINATA_GATEWAY}/ipfs/${data.IpfsHash}`,
        };
    } catch (error) {
        console.error('IPFS file upload error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Upload a JSON metadata object to IPFS via Pinata
 * @param {object} jsonData
 * @param {string} name  name tag for the pin
 * @returns {{ success: boolean, ipfsHash?: string, gatewayUrl?: string, error?: string }}
 */
export const uploadJSONToIPFS = async (jsonData, name = 'credential-metadata') => {
    try {
        if (!PINATA_JWT) throw new Error('VITE_PINATA_JWT not set in .env');

        const response = await fetch(PIN_JSON_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${PINATA_JWT}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pinataContent: jsonData,
                pinataMetadata: { name },
            }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.details || 'Pinata JSON upload failed');
        }

        const data = await response.json();
        return {
            success: true,
            ipfsHash: data.IpfsHash,
            ipfsUrl: `ipfs://${data.IpfsHash}`,
            gatewayUrl: `${PINATA_GATEWAY}/ipfs/${data.IpfsHash}`,
        };
    } catch (error) {
        console.error('IPFS JSON upload error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Resolve an ipfs:// URI to a HTTP gateway URL
 * @param {string} ipfsUri  e.g. "ipfs://Qm..."
 */
export const resolveIPFSUrl = (ipfsUri) => {
    if (!ipfsUri) return null;
    const hash = ipfsUri.replace('ipfs://', '');
    return `${PINATA_GATEWAY}/ipfs/${hash}`;
};
