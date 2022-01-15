const path = require('path');
const fs = require('fs-extra');
const inquirer = require('inquirer');

const config = {
  src: './sources/bookmarks.json',
  good: './good-links.txt',
  start: 0,
};

const getConfig = async() => {
  const dir = './sources';
  const allSources = await fs.readdir(dir);
  const sources = allSources
  .filter((file) => file.endsWith('.json'))
  .map((file) => path.join(dir, file));

  sources.push('OTHER');

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'browser',
      message: 'Browser from which you got the bookmarks',
      choices: [
        'edge',
        'vivaldi',
        'brave',
        'chrome',
        'firefox',
        'other',
      ],
    },
    {
      type: 'list',
      choices: sources,
      name: 'src',
      message: 'Source file containing bookmarks JSON (in ./sources directory).',
      default: config.src,
    },
    {
      type: 'input',
      name: 'otherSrc',
      message: 'Path to bookmarks JSON file, relative to project root',
      when(answers) {
        return answers.src === 'OTHER';
      },
    },
    {
      type: 'input',
      name: 'good',
      message: 'Path to txt file containing URLs already tested and found good',
      default: config.good,
    },
    {
      type: 'input',
      name: 'start',
      message: 'Start index of bookmarks to test',
      default: config.start,
    },
    {
      type: 'input',
      name: 'end',
      message: 'End index of bookmarks to test',
    },
  ]);

  if (answers.end === '') {
    answers.end = undefined;
  }

  if (answers.src === 'OTHER') {
    answers.src = answers.otherSrc;
  }

  return answers;
};

module.exports = {config, getConfig};
