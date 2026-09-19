import { NextResponse } from "next/server";
import { querySnowflake } from "@/lib/snowflake";

// ------------------------------------------------------------
// GET
// Simple Snowflake connection test
// ------------------------------------------------------------

export async function GET() {
  try {
    const rows = await querySnowflake(`
      SELECT
        CURRENT_WAREHOUSE() AS warehouse,
        CURRENT_DATABASE() AS database,
        CURRENT_SCHEMA() AS schema
    `);

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Snowflake connection test failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Could not connect to Snowflake",
      },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------
// POST
// Generate a new random 18-year-old character
// ------------------------------------------------------------

export async function POST() {
  try {
    // --------------------------------------------------------
    // 1. Random name
    // --------------------------------------------------------

    const nameRows = await querySnowflake(`
      SELECT first_name
      FROM FIRST_NAMES
      ORDER BY RANDOM()
      LIMIT 1
    `);

    // --------------------------------------------------------
    // 2. Random city
    // --------------------------------------------------------

    const cityRows = await querySnowflake(`
      SELECT
        city_id,
        city_name,
        state,
        cost_of_living_multiplier,
        typical_rent
      FROM CITIES
      ORDER BY RANDOM()
      LIMIT 1
    `);

    // --------------------------------------------------------
    // 3. Random financial background
    // --------------------------------------------------------

    const backgroundRows = await querySnowflake(`
      SELECT
        background_id,
        background_name,
        description,
        savings_min,
        savings_max,
        cash_min,
        cash_max,
        monthly_expenses_min,
        monthly_expenses_max,
        starting_rent,
        living_situation
      FROM STARTING_BACKGROUNDS
      ORDER BY RANDOM()
      LIMIT 1
    `);

    // --------------------------------------------------------
    // 4. Random occupation available at age 18
    // --------------------------------------------------------

    const occupationRows = await querySnowflake(`
      SELECT
        occupation_id,
        title,
        industry,
        annual_salary
      FROM OCCUPATIONS
      WHERE minimum_age <= 18
      ORDER BY RANDOM()
      LIMIT 1
    `);

    const name = nameRows[0] as Record<string, unknown>;
    const city = cityRows[0] as Record<string, unknown>;
    const background = backgroundRows[0] as Record<string, unknown>;
    const occupation = occupationRows[0] as Record<string, unknown>;

    if (!name || !city || !background || !occupation) {
      throw new Error("Character generation data is missing.");
    }

    // --------------------------------------------------------
    // 5. Generate random starting finances
    // --------------------------------------------------------

    const randomBetween = (min: number, max: number) => {
      return Math.round(
        min + Math.random() * (max - min)
      );
    };

    const savings = randomBetween(
      Number(background.SAVINGS_MIN),
      Number(background.SAVINGS_MAX)
    );

    const cash = randomBetween(
      Number(background.CASH_MIN),
      Number(background.CASH_MAX)
    );

    const monthlyExpenses = randomBetween(
      Number(background.MONTHLY_EXPENSES_MIN),
      Number(background.MONTHLY_EXPENSES_MAX)
    );

    // --------------------------------------------------------
    // 6. Insert generated player into Snowflake
    // --------------------------------------------------------

    await querySnowflake(
      `
      INSERT INTO PLAYERS (
        first_name,
        age,
        city_id,
        background_id,
        occupation_id,
        annual_salary,
        savings,
        cash,
        student_debt,
        credit_card_debt,
        car_debt,
        credit_score,
        emergency_fund,
        monthly_rent,
        monthly_expenses,
        has_car,
        has_credit_card,
        college_status,
        experiences,
        xtract_tokens,
        game_over
      )
      VALUES (
        ?,
        18,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        0,
        0,
        0,
        NULL,
        0,
        ?,
        ?,
        FALSE,
        FALSE,
        'NONE',
        0,
        3,
        FALSE
      )
      `,
      [
        String(name.FIRST_NAME),
        Number(city.CITY_ID),
        Number(background.BACKGROUND_ID),
        Number(occupation.OCCUPATION_ID),
        Number(occupation.ANNUAL_SALARY),
        savings,
        cash,
        Number(background.STARTING_RENT),
        monthlyExpenses,
      ]
    );

    // --------------------------------------------------------
    // 7. Find the player ID Snowflake generated
    // --------------------------------------------------------

    const playerRows = await querySnowflake(
      `
      SELECT player_id
      FROM PLAYERS
      WHERE first_name = ?
        AND city_id = ?
        AND background_id = ?
        AND occupation_id = ?
        AND savings = ?
        AND cash = ?
      ORDER BY created_at DESC, player_id DESC
      LIMIT 1
      `,
      [
        String(name.FIRST_NAME),
        Number(city.CITY_ID),
        Number(background.BACKGROUND_ID),
        Number(occupation.OCCUPATION_ID),
        savings,
        cash,
      ]
    );

    if (!playerRows[0]?.PLAYER_ID) {
      throw new Error("Player was created but player ID could not be found.");
    }

    const playerId = Number(playerRows[0].PLAYER_ID);

    // --------------------------------------------------------
    // 8. Return generated character to frontend
    // --------------------------------------------------------

    return NextResponse.json({
      success: true,

      player: {
        playerId,

        firstName: name.FIRST_NAME,
        age: 18,

        city: {
          id: city.CITY_ID,
          name: city.CITY_NAME,
          state: city.STATE,
        },

        background: {
          id: background.BACKGROUND_ID,
          name: background.BACKGROUND_NAME,
          description: background.DESCRIPTION,
          livingSituation: background.LIVING_SITUATION,
        },

        occupation: {
          id: occupation.OCCUPATION_ID,
          title: occupation.TITLE,
          industry: occupation.INDUSTRY,
          annualSalary: occupation.ANNUAL_SALARY,
        },

        finances: {
          savings,
          cash,
          studentDebt: 0,
          creditCardDebt: 0,
          carDebt: 0,
          creditScore: null,
          emergencyFund: 0,
          monthlyRent: Number(background.STARTING_RENT),
          monthlyExpenses,
        },

        hasCar: false,
        hasCreditCard: false,
        collegeStatus: "NONE",

        xtractTokens: 3,
      },
    });
  } catch (error) {
    console.error("Character generation failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Could not generate character",
      },
      { status: 500 }
    );
  }
}