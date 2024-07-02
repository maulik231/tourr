const express = require("express");
const auth = require("../middleware/authenticateJWT");

const userController = require("../controllers/userController");
const productController = require("../controllers/packageControllers");
const {
  registerValidationRules,
} = require("../validate/registerValidationMiddleware");


const {
  packagesValidationRules,
} = require("../validate/packagesValidationMiddleware");

const router = express.Router();
router.use(express.json());

// register api
router.post(
  "/register",
  registerValidationRules(),
  userController.register
);
// login api
router.post("/login", userController.login);
router.post("/logout", auth, userController.logout);
// user api
router.put("/update/:id", auth, userController.updateUser);
router.get("/user", auth, userController.getUser);
// add package details
router.post("/packages", auth, packagesValidationRules(), productController.addPackages);
router.get("/packages", auth, productController.getPackages);
router.post("/search-packages", auth, productController.searchPackages);
router.post("/send-quote", auth, productController.sendQuote);
router.post("/packages/duplicate/:id", auth, productController.duplicate);
router.delete("/packages/:id", auth, productController.deletePackage);
router.put("/packages/:id", auth, productController.editPackage);
router.get("/packages/:id", auth, productController.getPackage);
router.get("/package-all-details", auth, productController.addProductDetails);
router.get("/attractions", auth, productController.attractions);
router.get('/countries', auth, productController.countries);
router.get('/cities', auth, productController.cities);

module.exports = router;
