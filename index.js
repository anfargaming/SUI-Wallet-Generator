import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { generateMnemonic, mnemonicToSeedSync } from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import fs from 'fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import figlet from 'figlet';
import inquirer from 'inquirer';

const SUI_DERIVATION_PATH = "m/44'/784'/0'/0'/0'";

const FILES = {
  ADDRESSES: 'wallet_addresses.txt',
  MNEMONICS: 'wallet_mnemonics.txt',
  PRIVATE_KEYS: 'wallet_private_keys.txt',
  DETAILS: 'wallet_details.txt',
};

const log = {
  info: (...args) => console.log("\n" + chalk.blueBright("[INFO]"), ...args, "\n"),
  success: (...args) => console.log("\n" + chalk.greenBright("[SUCCESS]"), ...args, "\n"),
  error: (...args) => console.log("\n" + chalk.redBright("[ERROR]"), ...args, "\n"),
  warn: (...args) => console.log("\n" + chalk.yellowBright("[WARNING]"), ...args, "\n"),
};

function showBanner() {
  console.clear();
  console.log("\n" + chalk.magentaBright(figlet.textSync("SUI Wallets", { horizontalLayout: "full" })));
  console.log(chalk.cyanBright("\n🔐 Secure Ed25519 Wallet Generator for SUI 🔐\n"));
}

function generateWallet(index) {
  const mnemonic = generateMnemonic();
  const seed = mnemonicToSeedSync(mnemonic);
  const derived = derivePath(SUI_DERIVATION_PATH, seed.toString('hex'));
  const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(derived.key));
  const privateKey = Buffer.from(derived.key).toString('hex');
  const address = keypair.toSuiAddress();

  return {
    index: index + 1,
    address,
    mnemonic,
    privateKey,
  };
}

async function getUserInput() {
  const { walletCount } = await inquirer.prompt([
    {
      type: "number",
      name: "walletCount",
      message: "🔢 How many wallets to generate?",
      validate: (value) => value > 0 ? true : "Enter a number greater than 0",
    },
  ]);
  return walletCount;
}

async function getOutputPreferences() {
  const { outputOptions } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "outputOptions",
      message: "📂 What do you want to export?",
      choices: [
        { name: "Addresses", value: "address" },
        { name: "Mnemonics", value: "mnemonic" },
        { name: "Private Keys", value: "privateKey" },
        { name: "Full Details", value: "details" },
      ],
    },
  ]);
  return outputOptions;
}

async function saveToFile(path, data) {
  try {
    await fs.appendFile(path, data + "\n", "utf8");
  } catch {
    await fs.writeFile(path, data + "\n", "utf8");
  }
}

async function main() {
  try {
    showBanner();
    const walletCount = await getUserInput();
    const selections = await getOutputPreferences();

    const spinner = ora("🔄 Generating wallets...").start();
    const summary = [];

    const createdFiles = new Set();

    for (let i = 0; i < walletCount; i++) {
      const wallet = generateWallet(i);
      summary.push({
        "#": wallet.index,
        Address: wallet.address,
        Mnemonic: wallet.mnemonic.split(" ").slice(0, 2).join(" ") + "...",
        "Private Key": wallet.privateKey.slice(0, 8) + "...",
      });

      if (selections.includes("address")) {
        await saveToFile(FILES.ADDRESSES, wallet.address);
        createdFiles.add(FILES.ADDRESSES);
      }
      if (selections.includes("mnemonic")) {
        await saveToFile(FILES.MNEMONICS, wallet.mnemonic);
        createdFiles.add(FILES.MNEMONICS);
      }
      if (selections.includes("privateKey")) {
        await saveToFile(FILES.PRIVATE_KEYS, wallet.privateKey);
        createdFiles.add(FILES.PRIVATE_KEYS);
      }
      if (selections.includes("details")) {
        await saveToFile(FILES.DETAILS,
          `Wallet ${wallet.index}\nAddress: ${wallet.address}\nMnemonic: ${wallet.mnemonic}\nPrivate Key: ${wallet.privateKey}\n${"=".repeat(40)}`
        );
        createdFiles.add(FILES.DETAILS);
      }
    }

    spinner.succeed("✅ Wallets generated successfully!\n");
    console.log(chalk.cyanBright("📊 Wallet Summary:"));
    console.table(summary);

    if (createdFiles.size) {
      console.log(chalk.greenBright("\n📁 Files saved:"));
      for (const file of createdFiles) {
        console.log(chalk.magenta(`✔ ${file}`));
      }
    } else {
      console.log(chalk.yellow("\n⚠️ No files were created. You didn't select any output."));
    }

    console.log(chalk.yellowBright("\n🔒 Make sure to store your keys and mnemonics safely!\n"));

  } catch (err) {
    log.error("Unexpected error:", err.message);
  }
}

main();
