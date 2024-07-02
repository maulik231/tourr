const { body, validationResult } = require("express-validator");
const conn = require("../db/conn");

const registerValidationRules = () => {
  return [
    body("first_name").notEmpty().withMessage("First name is required"),
    body("last_name").notEmpty().withMessage("Last name is required"),
    body("email")
      .isEmail()
      .withMessage("Valid email is required")
      .bail()
      .custom(async (value, { req }) => {
        // Check if email already exists in the database
        const query = "SELECT email FROM user WHERE email = ?";
        const emailExists = await new Promise((resolve, reject) => {
          conn.query(query, [value], (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result.length > 0);
            }
          });
        });
        if (emailExists) {
          throw new Error("Email already in use");
        }
        return true;
      }),
    body("mobile")
      .notEmpty()
      .withMessage("Mobile number is required")
      .isMobilePhone()
      .withMessage("Invalid mobile number"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 6 characters long"),
    body("confirm_password")
      .notEmpty()
      .withMessage("Confirm password is required")
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Passwords do not match");
        }
        return true;
      }),
      (req, res, next) => {
        const errors = validationResult(req);
        if (errors.isEmpty()) {
          return next();
        }
      
        const extractedErrors = errors.array().reduce((acc, err) => {
          acc[err.path] = err.msg;
          return acc;
        }, {});
      
        return res.status(422).json({
          errors: extractedErrors,
        });
      }
  ];
};

module.exports = {
  registerValidationRules,
};
