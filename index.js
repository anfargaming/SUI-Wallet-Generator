import { Ed25519Keypair, encodeSuiPrivateKey } from "@mysten/sui.js/keypairs/ed25519";
import { mnemonicToSeedSync, generateMnemonic } from "bip39";
import { derivePath } from "ed25519-hd-key";
import chalk from "chalk";
import ora from "ora";
import figlet from "figlet";
import inquirer from "inquirer";
import fs from "fs/promises";

const SUI_DERIVATION_PATH = "m/44'/784'/0'/0'/0'";

const log = {
  info: (...args) => console.log("\n" + chalk.blueBright("[INFO]"), ...args, "\n"),
  success: (...args) => console.log("\n" + chalk.greenBright("[SUCCESS]"), ...args, "\n"),
  error: (...args) => console.log("\n" + chalk.redBright("[ERROR]"), ...args, "\n"),
  warn: (...args) => console.log("\n" + chalk.yellowBright("[WARNING]"), ...args, "\n"),
};

const FILES = {
  ADDRESSES: "sui_addresses.txt",
  PRIVATE_KEYS: "sui_private_keys.txt",
  MNEMONICS: "sui_mnemonics.txt",
  DETAILS: "sui_wallet_details.txt",
};

function showBanner() {
  console.clear();
  console.log("\n" + chalk.magentaBright(figlet.textSync("SUI Wallets", { horizontalLayout: "full" })));
  console.log(chalk.cyanBright("\n⚡ Generate SUI-Compatible Ed25519 Wallets ⚡\n"));
}

async function getUserInput() {
  const { walletCount } = await inquirer.prompt([
    {
      type: "number",
      name: "walletCount",
      message: "🔢 Enter number of SUI wallets to generate:",
      validate: (value) => value > 0 ? true : "Please enter a positive number.",
    },
  ]);
  return walletCount;
}

async function getOutputPreferences() {
  console.log(chalk.magentaBright("\n📂 Choose the output options:\n"));
  console.log(chalk.bgRedBright.bold(" 0. 🛑 Exit 🛑 "));
  console.log(chalk.yellowBright(" 1. Wallet Addresses Only"));
  console.log(chalk.yellowBright(" 2. Wallet Private Keys Only"));
  console.log(chalk.yellowBright(" 3. Wallet Mnemonics Only"));
  console.log(chalk.greenBright(" 4. All Wallet Details (Recommended)\n"));

  const { outputSelection } = await inquirer.prompt([
    {
      type: "input",
      name: "outputSelection",
      message: "📌 Enter the number(s) separated by commas (e.g., 1,3,4):",
      validate: (input) => input.match(/^([0-4],?)+$/) ? true : "Invalid input! Enter numbers 0-4 separated by commas.",
    },
  ]);

  if (outputSelection.includes("0")) {
    log.info("Exiting...");
    process.exit(0);
  }

  return outputSelection.split(",").map(Number);
}

function generateWallet(index) {
  const mnemonic = generateMnemonic();
  const seed = mnemonicToSeedSync(mnemonic);
  const derived = derivePath(SUI_DERIVATION_PATH, seed.toString("hex"));
  const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(derived.key));
  const address = keypair.toSuiAddress();

  // Encode to SUI format
  const suiPrivateKey = encodeSuiPrivateKey({
    schema: "ED25519",
    privateKey: keypair.getSecretKey(),
  });

  return {
    index: index + 1,
    address,
    mnemonic,
    privateKey: suiPrivateKey,
  };
}

async function saveToFile(filePath, data) {
  try {
    try {
      await fs.access(filePath);
      await fs.appendFile(filePath, data + "\n");
    } catch {
      await fs.writeFile(filePath, data + "\n");
    }
    return true;
  } catch (error) {
    log.error(`⚠️ Failed to save data to ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  try {
    showBanner();
    log.info("🔐 SUI Ed25519 Wallet Generator Initialized...");

    const walletCount = await getUserInput();
    const selectedOptions = await getOutputPreferences();

    const optionsMap = {
      1: { key: "ADDRESSES", data: (w) => w.address },
      2: { key: "PRIVATE_KEYS", data: (w) => w.privateKey },
      3: { key: "MNEMONICS", data: (w) => w.mnemonic },
      4: { key: "DETAILS", data: (w) =>
        `${w.index}. Wallet ${w.index}\n` +
        `Address: ${w.address}\n` +
        `Private Key: ${w.privateKey}\n` +
        `Mnemonic: ${w.mnemonic}\n` +
        "=".repeat(40) + "\n";
      },
    };

    log.info(`📜 Generating ${walletCount} wallets...\n`);
    const spinner = ora({ text: "🔄 Generating wallets...", color: "cyan" }).start();

    const walletData = [];
    const createdFiles = new Set();

    for (let i = 0; i < walletCount; i++) {
      const wallet = generateWallet(i);

      for (const option of selectedOptions) {
        const config = optionsMap[option];
        if (config) {
          const filePath = FILES[config.key];
          const success = await saveToFile(filePath, config.data(wallet));
          if (success) createdFiles.add(filePath);
        }
      }

      walletData.push({
        "#": wallet.index,
        "Address": wallet.address,
        "Private Key": wallet.privateKey.slice(0, 16) + "...",
        "Mnemonic": wallet.mnemonic.split(" ").slice(0, 2).join(" ") + "...",
      });
    }

    spinner.succeed(`✅ Successfully generated ${walletCount} SUI wallets!\n`);

    console.log(chalk.magentaBright("\n📊 Wallet Summary:"));
    console.table(walletData);

    if (createdFiles.size > 0) {
      console.log(chalk.greenBright("\n📁 Files Created:"));
      Array.from(createdFiles).forEach(file => {
        console.log(chalk.magentaBright(`✔ ${file}`));
      });
    }

    console.log(chalk.yellowBright("\n⚠️ Backup your private keys and mnemonics securely!"));
    console.log(chalk.greenBright("\n🎉 Wallets Generated Successfully!\n"));

  } catch (error) {
    log.error("Fatal error:", error);
    process.exit(1);
  }
}

main();
