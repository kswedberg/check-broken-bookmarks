import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import ax from 'axios';
import fs from 'node:fs';
import {promisify} from 'node:util';

// const {promisify} = require('util');
// const close = promisify(fs.close);

const close = promisify(fs.close);

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
    const dir = path.join(process.cwd(), 'broken');
    const file = path.join(dir, base);

    await mkdir(dir, {recursive: true});

    if (goodLinks) {
      console.log(`Omitted up to ${chalk.cyan(goodLinks)} links already found to be good`);
    }
    if (permittedUrls) {
      console.log(`Omitted links based on ${chalk.cyan(permittedUrls)} permissions in the config.yml`);
    }
    console.log(chalk.green(`\nFound ${succeeds} ${goodLinks ? 'NEW good' : 'good'} links`));
    console.log(chalk.red(`Found ${broken.length} broken links`));
    console.log('\nWriting broken links to file...', file);

    await writeFile(file, JSON.stringify(broken, null, 2));
  } catch (err) {
    console.log(chalk.red('Failed to write file'));
    console.log(err);
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
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.6845.92 Safari/537.36',
    Connection: 'keep-alive',
    Accept: 'text/html,application/xhtml+xml',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    DNT: '1',
    'Upgrade-Insecure-Requests': '1',
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

export {
  closeFd,
  handleSignal,
  outputBroken,
  axios,
  isUrlPermitted,
  isUrlPermittedWithStatus,
};
