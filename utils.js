const path = require('path');
const fse = require('fs-extra');
const fs = require('fs');
const chalk = require('chalk');

const {promisify} = require('util');
const close = promisify(fs.close);

const ax = require('axios');
const {config} = require('process');

const getTime = () => {
  const d = new Date();
  const pad = (n) => `${n}`.padStart(2, '0');

  const date = [
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
  ]
  .map(pad)
  .join('');

  const time = [
    d.getHours(),
    d.getMinutes(),
  ]
  .map(pad)
  .join('');

  return `${date}.${time}`;
};

const getGoodLinks = async(good) => {
  await fse.ensureFile(good);
  const goodFile = await fse.readFile(good, 'utf8');
  const goodLinks = goodFile.split('\n').filter((ln) => ln && !!ln.trim());

  return new Set(goodLinks);
};

const closeFd = async function(fd) {
  await close(fd);
};


const outputBroken = async({broken, succeeds, browser, fd}) => {
  console.log(chalk.green('Finished testing URLs'));

  try {
    await closeFd(fd);
  } catch (err) {
    console.log(chalk.red('Error closing file descriptor'));
  }

  try {
    const base = `${browser}.${getTime()}.json`;
    const file = path.join(process.cwd(), 'broken', base);

    console.log(chalk.green(`Found ${succeeds} good links`));
    console.log(chalk.red(`Found ${broken.length} broken links`));
    console.log('Writing broken links to file...', file);

    await fse.outputJson(file, broken);
  } catch (err) {
    console.log(chalk.red('Failed to write file'));
  }
};

const handleSignal = ({broken, succeeds, fd, browser}) => {
  return async(signal) => {
    console.log(`Received ${signal}!!!`);
    await outputBroken({broken, succeeds, fd, browser});
    process.exit(1);
  };
};

// @ts-ignore
const axios = ax.create({
  timeout: 6000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36 Edg/96.0.1054.57',
  },
});


module.exports = {
  getGoodLinks,
  closeFd,
  handleSignal,
  outputBroken,
  axios,
};
