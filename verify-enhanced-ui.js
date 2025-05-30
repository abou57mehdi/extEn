/**
 * Script to verify that the enhanced UI components are correctly set up
 */
const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");

async function verifyEnhancedUI() {
  console.log(chalk.blue("Verifying Enhanced UI Components..."));

  const requiredFiles = [
    { path: "src/popup/new-popup.html", name: "Enhanced Popup HTML" },
    { path: "src/popup/new-popup.js", name: "Enhanced Popup JavaScript" },
  ];

  const buildFiles = [
    { path: "build/index.html", name: "Build Popup HTML" },
    { path: "build/popup.js", name: "Build Popup JavaScript" },
    { path: "build/src/config.js", name: "Config Module" },
    { path: "build/src/popup/new-popup.html", name: "Source Popup HTML" },
    { path: "build/src/popup/new-popup.js", name: "Source Popup JavaScript" },
  ];

  // First verify source files exist
  let allSourceFilesExist = true;
  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, file.path);
    if (await fs.pathExists(filePath)) {
      console.log(chalk.green(`✓ ${file.name} exists`));
    } else {
      console.log(chalk.red(`✗ ${file.name} is missing`));
      allSourceFilesExist = false;
    }
  }

  if (!allSourceFilesExist) {
    console.log(
      chalk.red(
        "\nSource files are missing. Please ensure you have created the enhanced UI files."
      )
    );
    process.exit(1);
  }

  // Check if build exists
  if (!(await fs.pathExists(path.join(__dirname, "build")))) {
    console.log(
      chalk.yellow("\nBuild directory not found. Run the build script first.")
    );
    console.log(chalk.blue("Run: npm run build:enhanced-ui"));
    process.exit(0);
  }

  // Check build files
  let allBuildFilesExist = true;
  for (const file of buildFiles) {
    const filePath = path.join(__dirname, file.path);
    if (await fs.pathExists(filePath)) {
      console.log(chalk.green(`✓ ${file.name} exists in build`));
    } else {
      console.log(chalk.red(`✗ ${file.name} is missing from build`));
      allBuildFilesExist = false;
    }
  }

  // Verify manifest is pointing to index.html
  const manifestPath = path.join(__dirname, "build/manifest.json");
  let manifest;
  try {
    manifest = await fs.readJson(manifestPath);
    if (manifest.action && manifest.action.default_popup === "index.html") {
      console.log(chalk.green(`✓ Manifest correctly references index.html`));
    } else {
      console.log(
        chalk.red(`✗ Manifest should reference index.html as default_popup`)
      );
      allBuildFilesExist = false;
    }
  } catch (error) {
    console.log(chalk.red(`✗ Error reading manifest: ${error.message}`));
    allBuildFilesExist = false;
  }

  if (!allBuildFilesExist) {
    console.log(
      chalk.yellow("\nBuild files are incomplete. Run the build script again.")
    );
    console.log(chalk.blue("Run: npm run build:enhanced-ui"));
    process.exit(1);
  }

  console.log(
    chalk.green("\nEnhanced UI verification completed successfully!")
  );
  console.log(
    chalk.blue("Your extension is ready to use with the enhanced UI.")
  );
}

verifyEnhancedUI().catch((err) => {
  console.error(chalk.red("Error during verification:"), err);
  process.exit(1);
});
