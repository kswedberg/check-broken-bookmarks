const path = require('path');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const yaml = require('js-yaml');

const files = {
  root: '..',
  src: 'sources/bookmarks.json',
  good: 'config/good-links.txt',
  config: 'config/config.yml',
  configExample: 'config/config.example.yml',
};

const filePaths = {
  src: path.resolve(__dirname, files.root, files.src),
  good: path.join(__dirname, files.root, files.good),
  config: path.join(__dirname, files.root, files.config),
  configExample: path.join(__dirname, files.root, files.configExample),
};


const getGoodLinks = async() => {
  await fs.ensureFile(filePaths.good);
  const good = await fs.readFile(filePaths.good, 'utf8');

  const goodLinks = good.split('\n').filter((ln) => ln && !!ln.trim());

  return new Set(goodLinks);
};

const getConfigFromYaml = () => {
  const config = {
    defaults: {
      start: 0,
      end: undefined,
      browsers: ['chrome', 'firefox'],
      permittedUrls: [],
    },
  };

  return fs.readFile(filePaths.config, 'utf8')
  .then((file) => {
    config.file = yaml.load(file);

    return config;
  })
  .catch((err) => {
    return fs.readFile(filePaths.configExample, 'utf8')
    .then((file) => {
      config.example = yaml.load(file);

      return config;
    })
    .catch((_) => {
      return config;
    });
  });
};

const getInitialConfig = async() => {
  const allConfigs = await getConfigFromYaml();

  if (allConfigs.file) {
    return allConfigs.file;
  }

  const answers = await inquirer.prompt([
    {
      name: 'configOptions',
      message: 'You have no config.yml file in the config/ directory. What would you like to do?',
      type: 'list',
      choices: [

        {name: 'Use the example config file at config/config.example.yml', value: 'example'},
        {name: 'Use the example config file and copy it to config/config.yml', value: 'copy'},
        {name: 'Use a minimum set of defaults', value: 'defaults'},
      ],
    },
  ]);

  if (answers.configOptions === 'copy') {
    await fs.copy(filePaths.configExample, filePaths.config);
    answers.configOptions = 'example';
  }

  return allConfigs[answers.configOptions];
};

const handleAnswers = async(answers, config, goodLinks) => {
  // Handle Answers
  answers.start = +answers.start || 0;
  answers.end = +answers.end || undefined;

  if (answers.useGood) {
    answers.goodLinks = goodLinks;
  } else {
    answers.goodLinks = new Set();
  }
  if (answers.keepGood === false) {
    console.log('path exists', await fs.pathExists(filePaths.good));
    console.log('Removing good links file');
    await fs.remove(filePaths.good);
  }

  if (answers.src === 'OTHER') {
    answers.src = answers.otherSrc;
  }

  if (!answers.src.startsWith('/')) {
    answers.src = path.resolve(__dirname, '..', answers.src);
  }

  return Object.assign(config, answers);
};

const getConfig = async() => {
  const config = await getInitialConfig();
  const dir = './sources';
  const allSources = await fs.readdir(dir);
  const sources = allSources
  .filter((file) => file.endsWith('.json'))
  .map((file) => {
    return {
      name: file,
      value: path.resolve(__dirname, files.root, dir, file),
    };
  });

  sources.push({name: 'OTHER', value: 'OTHER'});

  const goodLinks = await getGoodLinks();
  const hasGoodLinks = goodLinks && goodLinks.size > 0;

  const answers = await inquirer.prompt([
    {
      name: 'browser',
      type: 'list',
      message: 'Browser from which you got the bookmarks',
      choices: config.browsers,
    },
    {
      name: 'src',
      type: 'list',
      choices: sources,
      message: 'Source file containing bookmarks JSON (in ./sources directory).',
    },
    {
      name: 'otherSrc',
      type: 'input',
      message: 'Path to bookmarks JSON file, relative to project root',
      when(answers) {
        return answers.src === 'OTHER';
      },
    },
    {
      name: 'useGood',
      type: 'confirm',
      message: 'Use a list of links this program has already checked for you and found good?',
      default: true,
      when: hasGoodLinks,
    },
    {
      name: 'keepGood',
      type: 'confirm',
      message: 'KEEP the list of links this program has found good for next time?',
      default: true,
      when(answers) {
        return hasGoodLinks && !answers.useGood;
      },
    },
    {
      name: 'start',
      type: 'input',
      message: 'Start index of bookmarks to test (default is 0)',
      default: config.start,
    },
    {
      name: 'end',
      type: 'input',
      message: 'End index of bookmarks to test (default is last bookmark)',
    },
  ]);

  const results = await handleAnswers(answers, config, goodLinks);
  const {permitted_urls: permittedUrls, ...rest} = results;

  rest.permittedUrls = permittedUrls || [];

  return rest;
};

module.exports = {filePaths, getConfig};
