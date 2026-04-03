// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo
import journal from './meta/_journal.json';
import m0000 from './0000_broken_dark_phoenix.sql';
import m0001 from './0001_square_shinko_yamashiro.sql';

export default {
  journal,
  migrations: {
    '0000_broken_dark_phoenix': m0000,
    '0001_square_shinko_yamashiro': m0001,
  }
};
  