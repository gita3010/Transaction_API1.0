const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transactionController");

// Initialize database
router.get("/initialize", transactionController.initializeDatabase);

// Get transactions with search and pagination
router.get("/transactions", transactionController.getTransactions);

// Get statistics
router.get("/statistics", transactionController.getStatistics);

// Get bar chart data
router.get("/bar-chart", transactionController.getBarChartData);

// Get pie chart data
router.get("/pie-chart", transactionController.getPieChartData);

// Get combined data
router.get("/combined-data", transactionController.getCombinedData);

module.exports = router;
