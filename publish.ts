import fs, { writeFileSync } from 'fs';
import inquirer from 'inquirer'
import { inc } from 'semver';

/**
 * This script will bump the version of the selected package and publish it to the registry.
 * It will also create a git tag and push it to the remote repository.
 * 
 * It will ask for the new version and then bump the version of the selected package.
 * 
 */
const packages = fs.readdirSync('packages/');
console.log(packages);

const { selectedPackage } = await inquirer
  .prompt(
    [
      {
        type: 'list',
        name: 'selectedPackage',
        message: 'Select the package to publish',
        choices: packages,
      },
    ]
  );

const packageDir = `packages/${selectedPackage}`;
const packagePath = `${packageDir}/package.json`;
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const packageVersion = packageJson.version;

const patchVersion = inc(packageVersion, 'patch');
const minorVersion = inc(packageVersion, 'minor');
const majorVersion = inc(packageVersion, 'major');

const { newVersion } = await inquirer
  .prompt([
    {
      type: 'list',
      name: 'newVersion',  
      message: 'Select the new version',
      choices: [patchVersion, minorVersion, majorVersion],
    },
  ]);

console.log(`Bumping ${selectedPackage} from ${packageVersion} to ${newVersion}`);
packageJson.version = newVersion;

console.log(`Writing to ${packagePath}`);
writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + "\n");

await Bun.spawn([
  'bun',
  'publish'
], {
  cwd: packageDir,
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
}).exited;

const gitTagName = `${selectedPackage}/${newVersion}`;

await Bun.spawn([
  'git',
  'tag',
  gitTagName,
  '-m',
  `Release ${selectedPackage} ${newVersion}`,
], {
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
}).exited;

await Bun.spawn([
  'git',
  'push',
  'origin',
  gitTagName,
], { stdin: 'inherit', stdout: 'inherit', stderr: 'inherit' }).exited;
