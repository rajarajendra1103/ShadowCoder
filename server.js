import 'dotenv/config';

import { httpServer } from './src/app.js';

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  console.log('Shadow Coder API running on port ' + PORT);
});
