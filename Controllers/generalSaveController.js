import pool from "../db.config/index.js";

const moduleMapping = {
  video_mania: {
    itemTable: "xpi_videos",
    categoryTable: "video_category",
    subCategoryTable: "video_sub_category",
    categoryFK: "video_category",
    subCategoryFK: "sub_category",
    idColumn: "id",
    nameColumn: "name"
  },
  kids: {
    itemTable: "kid_vids_videos",
    categoryTable: "kid_vids_category",
    subCategoryTable: "kid_vids_sub_category",
    categoryFK: "category_id",
    subCategoryFK: "sub_category_id",
    idColumn: "id",
    nameColumn: "name"
  },
  item: {
    itemTable: "item",
    categoryTable: "item_category",
    subCategoryTable: "item_sub_category",
    categoryFK: "item_category",
    subCategoryFK: "sub_category",
    idColumn: "id",
    nameColumn: "title"
  },
  cinematics: {
    itemTable: "cinematics_videos",
    categoryTable: "cinematics_category",
    subCategoryTable: "cinematics_sub_category",
    categoryFK: "category_id",
    subCategoryFK: "sub_category_id",
    idColumn: "id",
    nameColumn: "name"
  },
  fan_star: {
    itemTable: "fan_star_videos",
    categoryTable: "fan_star_category",
    subCategoryTable: "fan_star_sub_category",
    categoryFK: "category_id",
    subCategoryFK: "sub_category_id",
    idColumn: "id",
    nameColumn: "name"
  },
  learning_hobbies: {
    itemTable: "learning_hobbies_videos",
    categoryTable: "learning_hobbies_category",
    subCategoryTable: "learning_hobbies_sub_category",
    categoryFK: "category_id",
    subCategoryFK: "sub_category_id",
    idColumn: "id",
    nameColumn: "name"
  },
  tv_progmax: {
    itemTable: "tv_progmax_videos",
    categoryTable: "tv_progmax_category",
    subCategoryTable: "tv_progmax_sub_category",
    categoryFK: "category_id",
    subCategoryFK: "sub_category_id",
    idColumn: "id",
    nameColumn: "name"
  },
  sports: {
    itemTable: "sports",
    categoryTable: "sports_category",
    subCategoryTable: "sport_sub_category",
    categoryFK: "category_id",
    subCategoryFK: "sub_category_id",
    idColumn: "id",
    nameColumn: "name"
  },
  news: {
    itemTable: "NEWS",
    categoryTable: "NEWS_category",
    subCategoryTable: "NEWS_sub_category",
    categoryFK: "category",
    subCategoryFK: "sub_category",
    idColumn: "id",
    nameColumn: "name"
  },
  qafi: {
    itemTable: "QAFI",
    categoryTable: "QAFI_category",
    subCategoryTable: "QAFI_sub_category",
    categoryFK: "category",
    subCategoryFK: "sub_category",
    idColumn: "id",
    nameColumn: "name"
  },
  gebc: {
    itemTable: "GEBC",
    categoryTable: "GEBC_category",
    subCategoryTable: "GEBC_sub_category",
    categoryFK: "category",
    subCategoryFK: "sub_category",
    idColumn: "id",
    nameColumn: "name"
  },
  pic_tour: {
    itemTable: "pic_tours",
    categoryTable: "pic_category",
    subCategoryTable: "pic_sub_category",
    categoryFK: "pic_category",
    subCategoryFK: "sub_category",
    idColumn: "id",
    nameColumn: "name"
  }
};

export const toggleSaveItem = async (req, res) => {
  try {
    const { user_id, item_id, module_name } = req.body;

    if (!user_id || !item_id || !module_name) {
      return res.status(400).json({
        statusCode: 400,
        message: "user_id, item_id, and module_name are required",
      });
    }

    const mapping = moduleMapping[module_name];
    if (!mapping) {
      return res.status(400).json({
        statusCode: 400,
        message: "Invalid module_name",
      });
    }

    // Check if user exists
    const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [user_id]);
    if (userCheck.rowCount === 0) {
      return res.status(404).json({ statusCode: 404, message: "User not found" });
    }

    // Check if item exists in its respective table
    const itemCheck = await pool.query(`SELECT id FROM ${mapping.itemTable} WHERE ${mapping.idColumn} = $1`, [item_id]);
    if (itemCheck.rowCount === 0) {
      return res.status(404).json({ statusCode: 404, message: "Item not found in module " + module_name });
    }

    // Check if record already exists in general_save_item
    const existing = await pool.query(
      "SELECT id FROM general_save_item WHERE user_id = $1 AND item_id = $2 AND module_name = $3",
      [user_id, item_id, module_name]
    );

    if (existing.rowCount > 0) {
      // Unsave
      await pool.query(
        "DELETE FROM general_save_item WHERE user_id = $1 AND item_id = $2 AND module_name = $3",
        [user_id, item_id, module_name]
      );
      return res.status(200).json({
        statusCode: 200,
        message: "Item unsaved successfully",
        is_saved: false
      });
    } else {
      // Save
      await pool.query(
        "INSERT INTO general_save_item (user_id, item_id, module_name) VALUES ($1, $2, $3)",
        [user_id, item_id, module_name]
      );
      return res.status(201).json({
        statusCode: 201,
        message: "Item saved successfully",
        is_saved: true
      });
    }
  } catch (error) {
    console.error("Error in toggleSaveItem:", error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const getSavedItems = async (req, res) => {
  try {
    const { module_name, main_category_id, user_id } = req.query;

    if (!module_name || !main_category_id || !user_id) {
      return res.status(400).json({
        statusCode: 400,
        message: "module_name, main_category_id, and user_id are required",
      });
    }

    const mapping = moduleMapping[module_name];
    if (!mapping) {
      return res.status(400).json({
        statusCode: 400,
        message: "Invalid module_name",
      });
    }

    // 1. Fetch Main Category Details
    const categoryQuery = `SELECT * FROM ${mapping.categoryTable} WHERE id = $1`;
    const categoryResult = await pool.query(categoryQuery, [main_category_id]);
    if (categoryResult.rowCount === 0) {
      return res.status(404).json({ statusCode: 404, message: "Main category not found" });
    }

    // 2. Fetch Subcategories for this Main Category
    const subCategoryQuery = `SELECT * FROM ${mapping.subCategoryTable} WHERE category_id = $1`;
    const subCategoryResult = await pool.query(subCategoryQuery, [main_category_id]);

    // 3. Fetch Saved Items for this module and user, filtered by main category
    const itemsQuery = `
      SELECT 
        it.*,
        u.username,
        u.image as user_image,
        true as is_saved
      FROM general_save_item gsi
      JOIN ${mapping.itemTable} it ON gsi.item_id = it.${mapping.idColumn}
      JOIN users u ON it.user_id = u.id
      WHERE gsi.user_id = $1 
        AND gsi.module_name = $2
        AND it.${mapping.categoryFK} = $3
    `;
    const itemsResult = await pool.query(itemsQuery, [user_id, module_name, main_category_id]);

    // Construct Response
    const response = {
      statusCode: 200,
      category: categoryResult.rows[0],
      subCategories: subCategoryResult.rows,
      savedItems: itemsResult.rows
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error in getSavedItems:", error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
