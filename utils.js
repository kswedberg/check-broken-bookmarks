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

const closeFd = async function(fd) {
  await close(fd);
};

const outputBroken = async({broken, succeeds, browser, fd, permittedUrls, goodLinks}) => {
  console.log(chalk.green('Finished checking URLs\n'));

  try {
    await closeFd(fd);
  } catch (err) {
    console.log(chalk.red('Error closing file descriptor'));
  }

  try {
    const base = `${browser}.${getTime()}.json`;
    const file = path.join(process.cwd(), 'broken', base);

    if (goodLinks) {
      console.log(`Omitted up to ${chalk.cyan(goodLinks)} links already found to be good`);
    }
    if (permittedUrls) {
      console.log(`Omitted links based on ${chalk.cyan(permittedUrls)} permissions in the config.yml`);
    }
    console.log(chalk.green(`\nFound ${succeeds} ${goodLinks ? 'NEW good' : 'good'} links`));
    console.log(chalk.red(`Found ${broken.length} broken links`));
    console.log('\nWriting broken links to file...', file);

    await fse.outputJson(file, broken);
  } catch (err) {
    console.log(chalk.red('Failed to write file'));
  }
};

const handleSignal = (settings) => {
  return async(signal) => {
    console.log(`Received ${signal}!!!`);
    await outputBroken(settings);
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

const isUrlPermitted = (allPermitted = [], url) => {
  return allPermitted.some((permitted) => !permitted.status && url.includes(permitted.url));
};

const isUrlPermittedWithStatus = (allPermitted = [], url, status) => {
  if (!status) {
    return false;
  }

  return allPermitted.some((permitted) => url.includes(permitted.url) && (!permitted.status || permitted.status === status));
};

module.exports = {
  closeFd,
  handleSignal,
  outputBroken,
  axios,
  isUrlPermitted,
  isUrlPermittedWithStatus,
};
