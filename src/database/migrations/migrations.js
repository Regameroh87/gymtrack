import journal from './meta/_journal.json';
import m0000 from './0000_broken_dark_phoenix.sql';
import m0001 from './0001_square_shinko_yamashiro.sql';
import m0002 from './0002_steep_james_howlett.sql';

export default {
  journal,
  migrations: {
    '0000_broken_dark_phoenix': m0000,
    '0001_square_shinko_yamashiro': m0001,
    '0002_steep_james_howlett': m0002,
  }
}
  