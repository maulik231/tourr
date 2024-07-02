const conn = require("../db/conn");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { addToBlacklist } = require("./tokenBlacklist");

const saltRounds = 15;
// user registration
exports.register = async (req, res) => {
  try {
    // Destructuring req.body for cleaner code
    const { first_name, last_name, email, mobile, password } = req.body;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Prepare the query and execute it
    const query = `INSERT INTO user (first_name, last_name, email, mobile, password) VALUES (?, ?, ?, ?, ?)`;
    conn.query(
      query,
      [first_name, last_name, email, mobile, hashedPassword],
      (err, result) => {
        if (err) {
          console.error("Error executing query:", err);
          return res.status(500).json({
            message: "Internal server error",
            status: "false",
          });
        }

        // If insertion successful
        res.status(201).json({
          message: "User registered successfully",
          status: "true",
        });
      }
    );
  } catch (error) {
    console.error("Error in registration:", error);
    res.status(500).json({
      message: "Internal server error",
      status: "false",
    });
  }
};

// user login
exports.login = async (request, response) => {
  const { email, password } = request.body;

  try {
    if (!email || !password) {
      return response
        .status(400)
        .json({ error: true, message: "Please enter email and password" });
    }

    conn.query(
      "SELECT * FROM user WHERE email = ?",
      [email],
      async function (error, results, fields) {
        if (error) {
          console.error("Database error:", error);
          return response
            .status(500)
            .json({ error: true, message: "Database error" });
        }

        if (results.length > 0) {
          const user = results[0];
          const hashedPassword = user.password;

          // Compare provided password with hashed password from database
          const passwordMatch = await bcrypt.compare(password, hashedPassword);
          if (passwordMatch) {
            // Passwords match, generate JWT token
            const payload = { userId: user.id, email: user.email };
            const expiration = "1h";

            const token = jwt.sign(payload, "test", {
              expiresIn: expiration,
            });

            response.status(200).json({
              message: "Login successful",
              user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                mobile: user.mobile,
              },
              token,
            });
          } else {
            response
              .status(401)
              .json({ error: true, message: "Wrong email or password" });
          }
        } else {
          response
            .status(401)
            .json({ error: true, message: "Wrong email or password" });
        }
      }
    );
  } catch (error) {
    response
      .status(500)
      .json({ error: true, message: "Internal server error" });
  }
};

// update user
exports.updateUser = async (request, response) => {
  const { id } = request.params;
  const { first_name, last_name, email, mobile, password } = request.body;
  conn.query(
    `UPDATE user SET first_name = ?, last_name = ?, email = ?,  mobile = ?, password = ? WHERE id = ${id}`,
    // console.log(first_name, last_name, email, mobile, password)
    [first_name, last_name, email, mobile, password, id],
    (error) => {
      if (error) {
        console.error("----[][][]", error);
        response.status(500).send("Error updating user");
      } else {
        response.send("User updated successfully");
      }
    }
  );
};

exports.logout = async (request, response) => {
  const authHeader = request.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  addToBlacklist(token);
  response.status(200).json({ message: "Logged out successfully" });
};

// get all user data
exports.getUser = async (req, res) => {
  // try {
  //   conn.query("SELECT * FROM user", (err, results) => {
  //     if (err) throw err;
  //     res.json(results);
  //   });
  // } catch (error) {
  //   res.status(401).json({
  //     message: "No available data",
  //     status: "false",
  //     error: error.message,
  //   });
  // }

  // conn.connect(function (err) {
  // if (err) throw err;
  /*Connect two tables by using one field from each table as the connection point:*/
  conn.connect(
    "SELECT user.name AS user, product.name AS favorite FROM user JOIN product ON user.favorite_product = product.id"
  );
  conn.query(sql, function (err, result) {
    if (err) throw err;
    console.log(result);
  });
  // });
};
