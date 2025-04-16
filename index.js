// SUI Wallet Generator with Terminal UI ✨

import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import { derivePath } from "ed25519-hd-key";
import chalk from "chalk";
import ora from "ora";
import figlet from "figlet";
import inquirer from "inquirer";
import fs from "fs/promises";

// 🔒 Derivation path for SUI
const SUI_DERIVATION_PATH = "m/44'/784'/0'/0'/0'";

const log = {
  info: (...args) => console.log("\n" + chalk.blueBright("[INFO]"), ...args, "\n"),
  success: (...args) => console.log("\n" + chalk.greenBright("[SUCCESS]"), ...args, "\n"),
  error: (...args) => console.log("\n" + chalk.redBright("[ERROR]"), ...args, "\n"),
  warn: (...args) => console.log("\n" + chalk.yellowBright("[WARNING]"), ...args, "\n"),
};

const FILES = {
  ADDRESSES: "wallet_addresses.txt",
  MNEMONICS: "wallet_mnemonics.txt",
  DETAILS: "wallet_details.txt",
  SERIALIZED_ADDRESSES: "wallet_serial_addresses.txt",
  SERIALIZED_MNEMONICS: "wallet_serial_mnemonics.txt",
};

function showBanner() {
  console.clear();
  console.log("\n" + chalk.magentaBright(figlet.textSync("SUI Wallets", { horizontalLayout: "full" })));
  console.log(chalk.cyanBright("\n🧠 Generates Ed25519 Keypairs for SUI Blockchain\n"));
}

function generateSuiWallet(index) {
  const mnemonic = generateMnemonic();
  const seed = mnemonicToSeedSync(mnemonic);
  const derived = derivePath(SUI_DERIVATION_PATH, seed.toString("hex"));
  const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(derived.key));
  const address = keypair.toSuiAddress();

  return {
    index: index + 1,
    address,
    mnemonic,
  };
}

async function getUserInput() {
  const { walletCount } = await inquirer.prompt([
    {
      type: "number",
      name: "walletCount",
      message: "🔢 How many SUI wallets would you like to generate?",
      validate: (value) => value > 0 ? true : "Please enter a positive number.",
    },
  ]);
  return walletCount;
}

async function getExportOptions() {
  console.log(chalk.magentaBright("\n📂 Select the wallet data you want to export:\n"));
  console.log(chalk.bgRedBright.bold(" 0. 🛑 Exit 🛑 "));
  console.log(chalk.yellowBright(" 1. Wallet Addresses Only"));
  console.log(chalk.yellowBright(" 2. Wallet Mnemonics Only"));
  console.log(chalk.greenBright(" 3. All Wallet Details (With Serial Number)"));
  console.log(chalk.cyanBright(" 4. All Wallet Addresses (With Serial Number)"));
  console.log(chalk.cyanBright(" 5. All Wallet Mnemonics (With Serial Number)\n"));

  const { selection } = await inquirer.prompt([
    {
      type: "input",
      name: "selection",
      message: "📌 Enter number(s) separated by commas (e.g., 1,3,4):",
      validate: (input) =>
        input.match(/^([0-5],?)+$/) ? true : "Invalid input! Use numbers 0-5 separated by commas.",
    },
  ]);

  if (selection.includes("0")) {
    log.info("Exiting...");
    process.exit(0);
  }

  return selection.split(",").map(Number);
}

async function saveToFile(filePath, data) {
  try {
    await fs.appendFile(filePath, data + "\n");
    return true;
  } catch (err) {
    log.error(`❌ Could not save to ${filePath}:`, err.message);
    return false;
  }
}

async function main() {
  showBanner();
  log.info("Initializing SUI Wallet Generator...");

  const walletCount = await getUserInput();
  const exportOptions = await getExportOptions();

  const optionsMap = {
    1: { key: "ADDRESSES", data: (w) => w.address },
    2: { key: "MNEMONICS", data: (w) => w.mnemonic },
    3: {
      key: "DETAILS",
      data: (w) =>
        `${w.index}. Wallet ${w.index}\nAddress: ${w.address}\nMnemonic: ${w.mnemonic}\n${"=".repeat(40)}\n`,
    },
    4: { key: "SERIALIZED_ADDRESSES", data: (w) => `${w.index}. ${w.address}` },
    5: { key: "SERIALIZED_MNEMONICS", data: (w) => `${w.index}. ${w.mnemonic}` },
  };

  const spinner = ora("🔄 Generating wallets...").start();
  const summary = [];
  const createdFiles = new Set();

  for (let i = 0; i < walletCount; i++) {
    const wallet = generateSuiWallet(i);

    for (const opt of exportOptions) {
      const conf = optionsMap[opt];
      if (conf) {
        const filePath = FILES[conf.key];
        const success = await saveToFile(filePath, conf.data(wallet));
        if (success) createdFiles.add(filePath);
      }
    }

    summary.push({
      "#": wallet.index,
      Address: wallet.address,
      Mnemonic: wallet.mnemonic.split(" ").slice(0, 2).join(" ") + "...",
    });
  }

  spinner.succeed(`✅ Successfully generated ${walletCount} wallets!\n`);
  console.log(chalk.magentaBright("\n📊 Wallet Summary:"));
  console.table(summary);

  if (createdFiles.size > 0) {
    console.log(chalk.greenBright("\n📁 Files Created:"));
    [...createdFiles].forEach((f) => console.log(chalk.cyan(`✔ ${f}`)));
  } else {
    console.log(chalk.yellowBright("\nℹ️ No files were saved (no export option selected)."));
  }

  console.log(chalk.yellowBright("\n⚠️ Don't forget to backup your mnemonics securely!"));
  console.log(chalk.greenBright("\n🎉 All done! Enjoy using your new SUI wallets.\n"));
}

main();
