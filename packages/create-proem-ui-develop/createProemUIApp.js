/*
TODOs:
    * Create template (from another repo?, files in this repo?)
    * Add back checkIfOnline and isOnline
    * Add back getPackageInfo?
    * Add back checkForLatestVersion?
    * Add back executeNodeScript?
    * Add back setCaretRangeForRuntimeDeps?
    * Add back makeCaretRange?
    * Put packageJson in a file?
    * Put list of dev and production pages in a repo? with the template?
    * Test using yarn
    * Add storybook
    * Check create-react-app and other examples for steps missing
*/

'use strict';

const chalk = require('chalk');
const commander = require('commander');
const envinfo = require('envinfo');
const packageJson = require('./package.json');
const semver = require('semver');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const spawn = require('cross-spawn');
const validateProjectName = require('validate-npm-package-name');
const headerStars = '***************';

const productionDependencies = [
    'react',
    'react-dom',
    "@babel/polyfill",
    "@material-ui/core",
    "axios",
    "classnames",
    "copyfile",
    "cross-env",
    "fs",
    "moment",
    "notistack",
    "prop-types",
    "qs",
    "react",
    "react-dom",
    "react-redux",
    "react-router",
    "react-router-dom",
    "react-transition-group",
    "redux",
    "redux-logger",
    "redux-promise-middleware",
    "redux-thunk",
    "showdown",
    "webpack",
    "webpack-cli",
    "webpack-dev-server",
    "webpack-merge"
];

const developmentDependencies = [
    "@babel/cli",
    "@babel/core",
    "@babel/plugin-proposal-class-properties",
    "@babel/plugin-proposal-export-default-from",
    "@babel/plugin-transform-classes",
    "@babel/plugin-transform-object-set-prototype-of-to-assign",
    "@babel/preset-env",
    "@babel/preset-react",
    "@babel/runtime",
    "babel-eslint",
    "babel-loader",
    "braces",
    "css-loader",
    "deep-equal",
    "eslint",
    "eslint-config-airbnb",
    "eslint-plugin-import",
    "eslint-plugin-jsx-a11y",
    "eslint-plugin-react",
    "file-loader",
    "fs-plus",
    "ftp-deploy",
    "history",
    "immutability-helper",
    "jasmine",
    "karma",
    "karma-chrome-launcher",
    "karma-jasmine",
    "karma-junit-reporter",
    "karma-sourcemap-loader",
    "karma-webpack",
    "puppeteer",
    "renamer",
    "replace-in-file",
    "rimraf",
    "style-loader",
    "stylelint",
    "stylelint-config-standard",
    "url-loader",
    "yargs"
];

let projectName;

function init() {
    const program = new commander.Command(packageJson.name)
      .version(packageJson.version)
      .arguments('<project-directory>')
      .usage(`${chalk.green('<project-directory>')} [options]`)
      .action(name => {
        projectName = name;
      })
      .option('--dev', "installs dev dependencies")
      .option('--verbose', 'print additional logs')
      .option('--info', 'print environment debug info')
      .option('--storybook', 'installs Storybook package') // TODO
      .on('--help', () => {
        console.log(
          `    Only ${chalk.green('<project-directory>')} is required.`
        );
        console.log();
        console.log(
          `    A custom ${chalk.cyan('--scripts-version')} can be one of:`
        );
        console.log(`      - a specific npm version: ${chalk.green('0.8.2')}`);
        console.log(`      - a specific npm tag: ${chalk.green('@next')}`);
        console.log(
          `      - a custom fork published on npm: ${chalk.green(
            'my-proem-ui-scripts'
          )}`
        );
        console.log(
          `      - a local path relative to the current working directory: ${chalk.green(
            'file:../my-proem-ui-scripts'
          )}`
        );
        console.log(
          `      - a .tgz archive: ${chalk.green(
            'https://mysite.com/my-proem-ui-scripts-0.8.2.tgz'
          )}`
        );
        console.log(
          `      - a .tar.gz archive: ${chalk.green(
            'https://mysite.com/my-proem-ui-scripts-0.8.2.tar.gz'
          )}`
        );
        console.log(
          `    It is not needed unless you specifically want to use a fork.`
        );
        console.log();
        console.log(
          `    If you have any problems, do not hesitate to file an issue:`
        );
        console.log(
          `      ${chalk.cyan(
            'https://github.com/cvazquez/proem-ui-develop/issues/new'
          )}`
        );
        console.log();
      })
      .parse(process.argv);

      if (program.info) {
        console.log(chalk.bold('\nEnvironment Info:'));
        console.log(
          `\n  current version of ${packageJson.name}: ${packageJson.version}`
        );
        console.log(`  running from ${__dirname}`);
        return envinfo
          .run(
            {
              System: ['OS', 'CPU'],
              Binaries: ['Node', 'npm', 'Yarn'],
              Browsers: [
                'Chrome',
                'Edge',
                'Internet Explorer',
                'Firefox',
                'Safari',
              ],
              npmPackages: ['react', 'react-dom'],
              npmGlobalPackages: ['create-proem-ui-develop'],
            },
            {
              duplicates: true,
              showNotFound: true,
            }
          )
          .then(console.log);
    }

    if (typeof projectName === 'undefined') {
        console.error('Please specify the project directory:');
        console.log(
          `  ${chalk.cyan(program.name())} ${chalk.green('<project-directory>')}`
        );
        console.log();
        console.log('For example:');
        console.log(
          `  ${chalk.cyan(program.name())} ${chalk.green('my-proem-ui-app')}`
        );
        console.log();
        console.log(
          `Run ${chalk.cyan(`${program.name()} --help`)} to see all options.`
        );
        process.exit(1);
    }

    createApp(
        projectName,
        program.verbose,
        program.scriptsVersion,
        program.template,
        program.useNpm,
        program.usePnp,
        program.dev
    );
}

function createApp(name, verbose, version, template, useNpm, usePnp, dev) {
    const root = path.resolve(name);
    const appName = path.basename(root);

    checkAppName(appName);

    fs.ensureDirSync(name);
    if (!isSafeToCreateProjectIn(root, name)) {
      process.exit(1);
    }

    console.log();
    console.log(`Creating a new Proem UI App in ${chalk.green(root)}.`);
    console.log();

    // Setup body of package.json
    const packageJson = {
        name: appName,
        version: '2.0.0',
        main: "main.js",
        scripts: {
            lint: "cross-env eslint . --ext .js --ext .jsx  --ignore-path .gitignore --cache",
            test: "karma start --single-run=true --watch=false karma.conf.js",
            "test:watch": "karma start --single-run=false --watch=true --browsers Chrome karma.conf.js",
            "bundle:prod": "cross-env webpack --progress --config webpack.prod.js",
            "bundle:stage": "cross-env webpack --progress --config webpack.stage.js",
            "bundle:dev": "cross-env webpack --progress --config webpack.dev.js",
            "bundle:local": "cross-env webpack --progress --config webpack.local.js",
            "bundle:watch": "cross-env webpack --progress --config webpack.local.js --watch",
            bundle: "npm run bundle:prod",
            clean: "rimraf dist/*",
            start: "webpack-dev-server --inline --hot --config webpack.local.js",
            build: "npm run clean && npm run bundle && npm run package",
            predeploy: "rimraf dist/web/prod/public && rimraf dist/web/prod/cloud",
            deploy: "npm run bundle:prod && cross-env copyfiles cloud/* cloud/models/* dist/web/prod && cross-env copyfiles img/* fonts/* css/* models/* landing/* renderer-bundle.js manifest.json index.html dist/web/prod/public",
            "predeploy:edge": "rimraf dist/web/edge/public && rimraf dist/web/edge/cloud",
            "deploy:edge": "npm run bundle:dev && cross-env copyfiles cloud/* cloud/models/* dist/web/edge && cross-env copyfiles img/* fonts/* css/* models/* landing/* renderer-bundle.js manifest.json  index.html dist/web/edge/public"
      },
        repository: "https://github.com/rwblackburn/proem-ui.git",
        author: {
            name: "Blackburn Labs",
            email: "rob@blackburnlabs.com",
            url: "http://www.blackburnlabs.com"
        },
        license: "none"
    };

    // Write body of package.json to root of new project
    fs.writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify(packageJson, null, 2) + os.EOL
    );

    const useYarn = useNpm ? false : shouldUseYarn();
    const originalDirectory = process.cwd();

    console.log("originalDirectory : ", originalDirectory)

    // Change to the root directory of the new project
    process.chdir(root);

    if (!useYarn && !checkThatNpmCanReadCwd()) {
      process.exit(1);
    }

    console.log("useYarn : ", useYarn)
    console.log("usePnp : ", usePnp)

    if (!useYarn) {
      const npmInfo = checkNpmVersion();
      if (!npmInfo.hasMinNpm) {
        if (npmInfo.npmVersion) {
          console.log(
            chalk.yellow(
              `You are using npm ${npmInfo.npmVersion} so the project will be bootstrapped with an old unsupported version of tools.\n\n` +
                `Please update to npm 6 or higher for a better, fully supported experience.\n`
            )
          );
        }
      }
    } else if (usePnp) {
      const yarnInfo = checkYarnVersion();
      if (yarnInfo.yarnVersion) {
        if (!yarnInfo.hasMinYarnPnp) {
          console.log(
            chalk.yellow(
              `You are using Yarn ${yarnInfo.yarnVersion} together with the --use-pnp flag, but Plug'n'Play is only supported starting from the 1.12 release.\n\n` +
                `Please update to Yarn 1.12 or higher for a better, fully supported experience.\n`
            )
          );
          // 1.11 had an issue with webpack-dev-middleware, so better not use PnP with it (never reached stable, but still)
          usePnp = false;
        }
        if (!yarnInfo.hasMaxYarnPnp) {
          console.log(
            chalk.yellow(
              'The --use-pnp flag is no longer necessary with yarn 2 and will be deprecated and removed in a future release.\n'
            )
          );
          // 2 supports PnP by default and breaks when trying to use the flag
          usePnp = false;
        }
      }
    }

    if (useYarn) {
      let yarnUsesDefaultRegistry = true;
      try {
        yarnUsesDefaultRegistry =
          execSync('yarnpkg config get registry').toString().trim() ===
          'https://registry.yarnpkg.com';
      } catch (e) {
        // ignore
      }
      if (yarnUsesDefaultRegistry) {
            fs.copySync(
            require.resolve('./yarn.lock.cached'),
            path.join(root, 'yarn.lock')
            );
        }
    }

    run(
        root,
        appName,
        version,
        verbose,
        originalDirectory,
        template,
        useYarn,
        usePnp,
        dev
    );
}

function shouldUseYarn() {
    try {
      execSync('yarnpkg --version', { stdio: 'ignore' });
      return true;
    } catch (e) {
      return false;
    }
  }

function checkAppName(appName) {
    const validationResult = validateProjectName(appName);
    if (!validationResult.validForNewPackages) {
      console.error(
        chalk.red(
          `Cannot create a project named ${chalk.green(
            `"${appName}"`
          )} because of npm naming restrictions:\n`
        )
      );
      [
        ...(validationResult.errors || []),
        ...(validationResult.warnings || []),
      ].forEach(error => {
        console.error(chalk.red(`  * ${error}`));
      });
      console.error(chalk.red('\nPlease choose a different project name.'));
      process.exit(1);
    }

    const dependencies = productionDependencies.concat(developmentDependencies).sort();
    if (dependencies.includes(appName)) {
      console.error(
        chalk.red(
          `Cannot create a project named ${chalk.green(
            `"${appName}"`
          )} because a dependency with the same name exists.\n` +
            `Due to the way npm works, the following names are not allowed:\n\n`
        ) +
          chalk.cyan(dependencies.map(depName => `  ${depName}`).join('\n')) +
          chalk.red('\n\nPlease choose a different project name.')
      );
      process.exit(1);
    }
  }

function install(root, useYarn, usePnp, dependencies, verbose, isOnline, dev) {
    return new Promise((resolve, reject) => {
      let command;
      let args;
      if (useYarn) {
        command = 'yarnpkg';
        args = ['add', '--exact'];
        if (!isOnline) {
          args.push('--offline');
        }
        if (usePnp) {
          args.push('--enable-pnp');
        }
        [].push.apply(args, prodDependencies);

        // Explicitly set cwd() to work around issues like
        // https://github.com/facebook/create-react-app/issues/3326.
        // Unfortunately we can only do this for Yarn because npm support for
        // equivalent --prefix flag doesn't help with this issue.
        // This is why for npm, we run checkThatNpmCanReadCwd() early instead.
        args.push('--cwd');
        args.push(root);

        if (!isOnline) {
          console.log(chalk.yellow('You appear to be offline.'));
          console.log(chalk.yellow('Falling back to the local Yarn cache.'));
          console.log();
        }
      } else {
        command = 'npm';
        args = [
          'install',
          '--save-exact',
          '--loglevel'
        ];

        args.push('error');
        args.push.apply(args, dependencies);

        if(dev) {
            args.push("--save-dev");
        }

        if (usePnp) {
          console.log(chalk.yellow("NPM doesn't support PnP."));
          console.log(chalk.yellow('Falling back to the regular installs.'));
          console.log();
        }
      }

      if (verbose) {
        args.push('--verbose');
      }

      const child = spawn(command, args, { stdio: 'inherit' });
      child.on('close', code => {
        if (code !== 0) {
          reject({
            command: `${command} ${args.join(' ')}`,
          });
          return;
        }
        resolve({
            success : true
        });
      });

    }).catch();
  }

  function run(
    root,
    appName,
    version,
    verbose,
    originalDirectory,
    template,
    useYarn,
    usePnp,
    dev
  ) {
    const isOnline = true;

    return new Promise((resolve) => {
        const dependencies = productionDependencies;

        console.log();
        console.log(`${headerStars} Installing Production packages. This might take a couple of minutes. ${headerStars}`);
        console.log();

        // Install production dependencies
        const prodInstall = install(
            root,
            useYarn,
            usePnp,
            dependencies,
            verbose,
            isOnline,
            false
        );

        resolve(prodInstall);
    }).then((prodInstall) => {
        if(!prodInstall.success) {
            console.log("****** Production install failed aborting *****");

            if(prodInstall.command) {
                console.log(prodInstall.command);

                throw new Error("Production install Failed running : ", prodInstall.command);
            }

            throw new Error("Production Install Failed!");
        }

            if(dev && prodInstall.success) {
                console.log();
                console.log(`${headerStars} Installing Development packages. This might take a couple of minutes. ${headerStars}`);
                console.log();

                // Installing Dev dependencies
                const dependencies = developmentDependencies;

                return new Promise((resolve) => {
                const devInstall = install(
                    root,
                    useYarn,
                    usePnp,
                    dependencies,
                    verbose,
                    isOnline,
                    dev
                  );

                  resolve(devInstall);
                });
            }
        }).then((devInstall) => {

            if(devInstall && !devInstall.success) {
                console.log("****** Development install failed aborting *****");

                if(devInstall.command) {
                    console.log(devInstall.command);

                    throw new Error("Development install Failed running : ", devInstall.command);
                }

                throw new Error("Development Install Failed!");
            }
        }).catch(reason => {
          console.log();
          console.log('Aborting installation.');
          if (reason.command) {
            console.log(`  ${chalk.cyan(reason.command)} has failed.`);
          } else {
            console.log(
              chalk.red('Unexpected error. Please report it as a bug:')
            );
            console.log(reason);
          }
          console.log();

          // On 'exit' we will delete these files from target directory.
          const knownGeneratedFiles = [
            'package.json',
            'yarn.lock',
            'node_modules',
            'package-lock.json',
          ];
          const currentFiles = fs.readdirSync(path.join(root));
          currentFiles.forEach(file => {
            knownGeneratedFiles.forEach(fileToMatch => {
              // This removes all knownGeneratedFiles.
              if (file === fileToMatch) {
                console.log(`Deleting generated file... ${chalk.cyan(file)}`);
                fs.removeSync(path.join(root, file));
              }
            });
          });
          const remainingFiles = fs.readdirSync(path.join(root));
          if (!remainingFiles.length) {
            // Delete target folder if empty
            console.log(
              `Deleting ${chalk.cyan(`${appName}/`)} from ${chalk.cyan(
                path.resolve(root, '..')
              )}`
            );
            process.chdir(path.resolve(root, '..'));
            fs.removeSync(path.join(root));
          } else {
              console.log("The following files are remaining and need to be deleted manually", remainingFiles);
          }
          console.log('Done.');
          process.exit(1);
        });
  }

  function getTemplateInstallPackage(template, originalDirectory) {
    let templateToInstall = 'cpuia-template';

    console.log("template in getTemplateInstallPackage() : ", template);

    if (template) {
      if (template.match(/^file:/)) {
        templateToInstall = `file:${path.resolve(
          originalDirectory,
          template.match(/^file:(.*)?$/)[1]
        )}`;
      } else if (
        template.includes('://') ||
        template.match(/^.+\.(tgz|tar\.gz)$/)
      ) {
        // for tar.gz or alternative paths
        templateToInstall = template;
      } else {
        // Add prefix 'cra-template-' to non-prefixed templates, leaving any
        // @scope/ and @version intact.
        const packageMatch = template.match(/^(@[^/]+\/)?([^@]+)?(@.+)?$/);
        const scope = packageMatch[1] || '';
        const templateName = packageMatch[2] || '';
        const version = packageMatch[3] || '';

        if (
          templateName === templateToInstall ||
          templateName.startsWith(`${templateToInstall}-`)
        ) {
          // Covers:
          // - cra-template
          // - @SCOPE/cra-template
          // - cra-template-NAME
          // - @SCOPE/cra-template-NAME
          templateToInstall = `${scope}${templateName}${version}`;
        } else if (version && !scope && !templateName) {
          // Covers using @SCOPE only
          templateToInstall = `${version}/${templateToInstall}`;
        } else {
          // Covers templates without the `cra-template` prefix:
          // - NAME
          // - @SCOPE/NAME
          templateToInstall = `${scope}${templateToInstall}-${templateName}${version}`;
        }
      }
    }

    return Promise.resolve(templateToInstall);
  }

  function getTemporaryDirectory() {
    return new Promise((resolve, reject) => {
      // Unsafe cleanup lets us recursively delete the directory if it contains
      // contents; by default it only allows removal if it's empty
      tmp.dir({ unsafeCleanup: true }, (err, tmpdir, callback) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            tmpdir: tmpdir,
            cleanup: () => {
              try {
                callback();
              } catch (ignored) {
                // Callback might throw and fail, since it's a temp directory the
                // OS will clean it up eventually...
              }
            },
          });
        }
      });
    });
  }

  function extractStream(stream, dest) {
    return new Promise((resolve, reject) => {
      stream.pipe(
        unpack(dest, err => {
          if (err) {
            reject(err);
          } else {
            resolve(dest);
          }
        })
      );
    });
  }

  function checkNpmVersion() {
    let hasMinNpm = false;
    let npmVersion = null;
    try {
      npmVersion = execSync('npm --version').toString().trim();
      hasMinNpm = semver.gte(npmVersion, '6.0.0');
    } catch (err) {
      // ignore
    }
    return {
      hasMinNpm: hasMinNpm,
      npmVersion: npmVersion,
    };
  }

  function checkYarnVersion() {
    const minYarnPnp = '1.12.0';
    const maxYarnPnp = '2.0.0';
    let hasMinYarnPnp = false;
    let hasMaxYarnPnp = false;
    let yarnVersion = null;
    try {
      yarnVersion = execSync('yarnpkg --version').toString().trim();
      if (semver.valid(yarnVersion)) {
        hasMinYarnPnp = semver.gte(yarnVersion, minYarnPnp);
        hasMaxYarnPnp = semver.lt(yarnVersion, maxYarnPnp);
      } else {
        // Handle non-semver compliant yarn version strings, which yarn currently
        // uses for nightly builds. The regex truncates anything after the first
        // dash. See #5362.
        const trimmedYarnVersionMatch = /^(.+?)[-+].+$/.exec(yarnVersion);
        if (trimmedYarnVersionMatch) {
          const trimmedYarnVersion = trimmedYarnVersionMatch.pop();
          hasMinYarnPnp = semver.gte(trimmedYarnVersion, minYarnPnp);
          hasMaxYarnPnp = semver.lt(trimmedYarnVersion, maxYarnPnp);
        }
      }
    } catch (err) {
      // ignore
    }
    return {
      hasMinYarnPnp: hasMinYarnPnp,
      hasMaxYarnPnp: hasMaxYarnPnp,
      yarnVersion: yarnVersion,
    };
  }

  function checkNodeVersion(packageName) {
    const packageJsonPath = path.resolve(
      process.cwd(),
      'node_modules',
      packageName,
      'package.json'
    );

    if (!fs.existsSync(packageJsonPath)) {
      return;
    }

    const packageJson = require(packageJsonPath);
    if (!packageJson.engines || !packageJson.engines.node) {
      return;
    }

    if (!semver.satisfies(process.version, packageJson.engines.node)) {
      console.error(
        chalk.red(
          'You are running Node %s.\n' +
            'Create React App requires Node %s or higher. \n' +
            'Please update your version of Node.'
        ),
        process.version,
        packageJson.engines.node
      );
      process.exit(1);
    }
  }

  // If project only contains files generated by GH, it’s safe.
  // Also, if project contains remnant error logs from a previous
  // installation, lets remove them now.
  // We also special case IJ-based products .idea because it integrates with CRA:
  // https://github.com/facebook/create-react-app/pull/368#issuecomment-243446094
  function isSafeToCreateProjectIn(root, name) {
    const validFiles = [
      '.DS_Store',
      '.git',
      '.gitattributes',
      '.gitignore',
      '.gitlab-ci.yml',
      '.hg',
      '.hgcheck',
      '.hgignore',
      '.idea',
      '.npmignore',
      '.travis.yml',
      'docs',
      'LICENSE',
      'README.md',
      'mkdocs.yml',
      'Thumbs.db',
    ];
    // These files should be allowed to remain on a failed install, but then
    // silently removed during the next create.
    const errorLogFilePatterns = [
      'npm-debug.log',
      'yarn-error.log',
      'yarn-debug.log',
    ];
    const isErrorLog = file => {
      return errorLogFilePatterns.some(pattern => file.startsWith(pattern));
    };

    const conflicts = fs
      .readdirSync(root)
      .filter(file => !validFiles.includes(file))
      // IntelliJ IDEA creates module files before CRA is launched
      .filter(file => !/\.iml$/.test(file))
      // Don't treat log files from previous installation as conflicts
      .filter(file => !isErrorLog(file));

    if (conflicts.length > 0) {
      console.log(
        `The directory ${chalk.green(name)} contains files that could conflict:`
      );
      console.log();
      for (const file of conflicts) {
        try {
          const stats = fs.lstatSync(path.join(root, file));
          if (stats.isDirectory()) {
            console.log(`  ${chalk.blue(`${file}/`)}`);
          } else {
            console.log(`  ${file}`);
          }
        } catch (e) {
          console.log(`  ${file}`);
        }
      }
      console.log();
      console.log(
        'Either try using a new directory name, or remove the files listed above.'
      );

      return false;
    }

    // Remove any log files from a previous installation.
    fs.readdirSync(root).forEach(file => {
      if (isErrorLog(file)) {
        fs.removeSync(path.join(root, file));
      }
    });
    return true;
  }

  function getProxy() {
    if (process.env.https_proxy) {
      return process.env.https_proxy;
    } else {
      try {
        // Trying to read https-proxy from .npmrc
        let httpsProxy = execSync('npm config get https-proxy').toString().trim();
        return httpsProxy !== 'null' ? httpsProxy : undefined;
      } catch (e) {
        return;
      }
    }
  }

  // See https://github.com/facebook/create-react-app/pull/3355
  function checkThatNpmCanReadCwd() {
    const cwd = process.cwd();
    let childOutput = null;
    try {
      // Note: intentionally using spawn over exec since
      // the problem doesn't reproduce otherwise.
      // `npm config list` is the only reliable way I could find
      // to reproduce the wrong path. Just printing process.cwd()
      // in a Node process was not enough.
      childOutput = spawn.sync('npm', ['config', 'list']).output.join('');
    } catch (err) {
      // Something went wrong spawning node.
      // Not great, but it means we can't do this check.
      // We might fail later on, but let's continue.
      return true;
    }
    if (typeof childOutput !== 'string') {
      return true;
    }
    const lines = childOutput.split('\n');
    // `npm config list` output includes the following line:
    // "; cwd = C:\path\to\current\dir" (unquoted)
    // I couldn't find an easier way to get it.
    const prefix = '; cwd = ';
    const line = lines.find(line => line.startsWith(prefix));
    if (typeof line !== 'string') {
      // Fail gracefully. They could remove it.
      return true;
    }
    const npmCWD = line.substring(prefix.length);
    if (npmCWD === cwd) {
      return true;
    }
    console.error(
      chalk.red(
        `Could not start an npm process in the right directory.\n\n` +
          `The current directory is: ${chalk.bold(cwd)}\n` +
          `However, a newly started npm process runs in: ${chalk.bold(
            npmCWD
          )}\n\n` +
          `This is probably caused by a misconfigured system terminal shell.`
      )
    );
    if (process.platform === 'win32') {
      console.error(
        chalk.red(`On Windows, this can usually be fixed by running:\n\n`) +
          `  ${chalk.cyan(
            'reg'
          )} delete "HKCU\\Software\\Microsoft\\Command Processor" /v AutoRun /f\n` +
          `  ${chalk.cyan(
            'reg'
          )} delete "HKLM\\Software\\Microsoft\\Command Processor" /v AutoRun /f\n\n` +
          chalk.red(`Try to run the above two lines in the terminal.\n`) +
          chalk.red(
            `To learn more about this problem, read: https://blogs.msdn.microsoft.com/oldnewthing/20071121-00/?p=24433/`
          )
      );
    }
    return false;
  }

  function checkIfOnline(useYarn) {
    if (!useYarn) {
      // Don't ping the Yarn registry.
      // We'll just assume the best case.
      return Promise.resolve(true);
    }

    return new Promise(resolve => {
      dns.lookup('registry.yarnpkg.com', err => {
        let proxy;
        if (err != null && (proxy = getProxy())) {
          // If a proxy is defined, we likely can't resolve external hostnames.
          // Try to resolve the proxy name as an indication of a connection.
          dns.lookup(url.parse(proxy).hostname, proxyErr => {
            resolve(proxyErr == null);
          });
        } else {
          resolve(err == null);
        }
      });
    });
  }

  module.exports = {
    init,
    getTemplateInstallPackage,
  };