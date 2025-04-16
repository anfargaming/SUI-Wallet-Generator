const { Ed25519Keypair } = require('@mysten/sui.js/keypairs/ed25519');
const { generateMnemonic, mnemonicToSeedSync } = require('bip39');
const { derivePath } = require('ed25519-hd-key');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const SUI_DERIVATION_PATH = "m/44'/784'/0'/0'/0'";

function generateSuiWallet() {
    const mnemonic = generateMnemonic();
    const seed = mnemonicToSeedSync(mnemonic);
    const derived = derivePath(SUI_DERIVATION_PATH, seed.toString('hex'));
    const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(derived.key));
    const address = keypair.toSuiAddress();

    return { address, mnemonic };
}

function saveToFile(filename, data) {
    fs.appendFileSync(filename, data + '\n', 'utf8');
}

function createWallets(numWallets) {
    console.log(`Đang tạo ${numWallets} ví Sui...`);

    if (fs.existsSync('wallet.txt')) fs.unlinkSync('wallet.txt');
    if (fs.existsSync('seed.txt')) fs.unlinkSync('seed.txt');

    for (let i = 0; i < numWallets; i++) {
        const { address, mnemonic } = generateSuiWallet();
        
        saveToFile('wallet.txt', address);
        saveToFile('seed.txt', mnemonic);

        console.log(`Ví ${i + 1}:`);
        console.log(`Địa chỉ: ${address}`);
        console.log(`Seed Phrase: ${mnemonic}`);
        console.log('---');
    }

    console.log('Save all wallets to Wallet.txt and Seed Phrase to Seed.txt!');
}

rl.question('How many wallets do you want to create? (Enter the number): ', (answer) => {
    const numWallets = parseInt(answer);
    if (isNaN(numWallets) || numWallets <= 0) {
        console.log('Please enter some bigger valids 0.');
    } else {
        createWallets(numWallets);
    }
    rl.close();
});
