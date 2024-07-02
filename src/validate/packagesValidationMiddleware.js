const { body, validationResult } = require("express-validator");

const packagesValidationRules = () => {
  return [
    // body('uuid').isUUID().withMessage('UUID is not valid'),
    // body('user_id')
    //   .isInt({ min: 1 })
    //   .withMessage('User ID must be an integer greater than 0')
    //   .bail()
    //   .custom(async (value) => {
    //     const [rows] = await pool.query('SELECT id FROM user WHERE id = ?', [value]);
    //     if (rows.length === 0) {
    //       throw new Error('User ID does not exist');
    //     }
    //     return true;
    //   }),
    body('title').notEmpty().withMessage('Title is required'),
    body('country').isLength({ min: 2, max: 2 }).withMessage('Country must be a 2-character code'),
    body('city').notEmpty().withMessage('City is required'),
    body('rate_validity').notEmpty().withMessage('Rate Validity is required'),
    body('min_passenger').notEmpty().withMessage('Min passenger is required'),
    body('max_passenger').notEmpty().withMessage('Max passenger is required'),
    // body('opted_airport_pickup').isInt({ min: 0, max: 1 }).withMessage('opted_airport_pickup must be 0 or 1'),
    // body('opted_airport_dropoff').isInt({ min: 0, max: 1 }).withMessage('opted_airport_dropoff must be 0 or 1'),
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
    packagesValidationRules,
};
