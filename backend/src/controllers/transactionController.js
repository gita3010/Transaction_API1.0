const Transaction = require("../models/Transaction");
const axios = require("axios");

// Initialize Database
exports.initializeDatabase = async (req, res) => {
  try {
    const response = await axios.get(process.env.API_URL);
    await Transaction.deleteMany({});
    await Transaction.insertMany(response.data);
    res.json({ success: true, message: "Database initialized successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// List Transactions
exports.getTransactions = async (req, res) => {
  try {
    const { month, search, page = 1, perPage = 10 } = req.query;

    let query = {
      $expr: {
        $eq: [{ $month: "$dateOfSale" }, parseInt(month)],
      },
    };

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      const searchNumber = !isNaN(search) ? Number(search) : null;

      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        ...(searchNumber ? [{ price: searchNumber }] : []),
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(perPage);

    const [transactions, total] = await Promise.all([
      Transaction.find(query).skip(skip).limit(parseInt(perPage)).lean(),
      Transaction.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(perPage)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Statistics
exports.getStatistics = async (req, res) => {
  try {
    const { month } = req.query;

    const statistics = await Transaction.aggregate([
      {
        $match: {
          $expr: {
            $eq: [{ $month: "$dateOfSale" }, parseInt(month)],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalSaleAmount: { $sum: "$price" },
          totalSoldItems: {
            $sum: { $cond: [{ $eq: ["$sold", true] }, 1, 0] },
          },
          totalNotSoldItems: {
            $sum: { $cond: [{ $eq: ["$sold", false] }, 1, 0] },
          },
        },
      },
    ]);

    res.json({
      success: true,
      data: statistics[0] || {
        totalSaleAmount: 0,
        totalSoldItems: 0,
        totalNotSoldItems: 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Bar Chart Data
exports.getBarChartData = async (req, res) => {
  try {
    const { month } = req.query;

    const ranges = [
      { min: 0, max: 100 },
      { min: 101, max: 200 },
      { min: 201, max: 300 },
      { min: 301, max: 400 },
      { min: 401, max: 500 },
      { min: 501, max: 600 },
      { min: 601, max: 700 },
      { min: 701, max: 800 },
      { min: 801, max: 900 },
      { min: 901, max: Infinity },
    ];

    const barChartData = await Promise.all(
      ranges.map(async ({ min, max }) => {
        const count = await Transaction.countDocuments({
          $expr: {
            $eq: [{ $month: "$dateOfSale" }, parseInt(month)],
          },
          price: {
            $gte: min,
            ...(max !== Infinity && { $lte: max }),
          },
        });
        return {
          range: max === Infinity ? `${min}-above` : `${min}-${max}`,
          count,
        };
      }),
    );

    res.json({ success: true, data: barChartData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Pie Chart Data
exports.getPieChartData = async (req, res) => {
  try {
    const { month } = req.query;

    const categoryData = await Transaction.aggregate([
      {
        $match: {
          $expr: {
            $eq: [{ $month: "$dateOfSale" }, parseInt(month)],
          },
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: categoryData.map((item) => ({
        category: item._id,
        count: item.count,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Combined API
exports.getCombinedData = async (req, res) => {
  try {
    const { month } = req.query;

    const [statistics, barChart, pieChart] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            $expr: { $eq: [{ $month: "$dateOfSale" }, parseInt(month)] },
          },
        },
        {
          $group: {
            _id: null,
            totalSaleAmount: { $sum: "$price" },
            totalSoldItems: {
              $sum: { $cond: [{ $eq: ["$sold", true] }, 1, 0] },
            },
            totalNotSoldItems: {
              $sum: { $cond: [{ $eq: ["$sold", false] }, 1, 0] },
            },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: {
            $expr: { $eq: [{ $month: "$dateOfSale" }, parseInt(month)] },
          },
        },
        {
          $bucket: {
            groupBy: "$price",
            boundaries: [0, 101, 201, 301, 401, 501, 601, 701, 801, 901],
            default: "901-above",
            output: {
              count: { $sum: 1 },
            },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: {
            $expr: { $eq: [{ $month: "$dateOfSale" }, parseInt(month)] },
          },
        },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        statistics: statistics[0] || {
          totalSaleAmount: 0,
          totalSoldItems: 0,
          totalNotSoldItems: 0,
        },
        barChart,
        pieChart: pieChart.map((item) => ({
          category: item._id,
          count: item.count,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
