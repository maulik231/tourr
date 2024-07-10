const mysql = require("mysql");

const conn = mysql.createConnection({
  // host: "localhost",
  // user: "root",
  // password: "",
  // database: "tuorr_1",
  host: "srv982.hstgr.io",
  user: "u479282372_tourr",
  password: "Tuorr123",
  database: "u479282372_tourr",
});

// Connect to the databasesd
conn.connect((err) => {
  if (err) {
    console.error("Database connection failed: " + err.stack);
    return;
  }
  console.log("Connected to the database");
});



// conn.connect(function (err) {
//   if (err) throw err;
//   console.log("Connected!");
//   var sql =
//   "CREATE TABLE product (product_id INT AUTO_INCREMENT, product_name VARCHAR(255), sku VARCHAR(255), price VARCHAR(255), category VARCHAR(255), user_id INT(11), PRIMARY KEY (product_id))";
//   conn.query(sql, function (err, result) {
//     if (err) throw err;
//     console.log("Table created");
//   });
// });

module.exports = conn;
