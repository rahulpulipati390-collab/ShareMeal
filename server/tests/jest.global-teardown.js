module.exports = async () => {
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();
    console.log('🗄️ Global teardown: In‑memory MongoDB stopped');
  }
};
