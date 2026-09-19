import snowflake from "snowflake-sdk";

const connection = snowflake.createConnection({
  account: process.env.SNOWFLAKE_ACCOUNT!,
  username: process.env.SNOWFLAKE_USERNAME!,
  password: process.env.SNOWFLAKE_PASSWORD!,
  warehouse: "SNOWFLAKE_LEARNING_WH",
  database: "BROKE_BY_30",
  schema: "GAME",
});

let connected = false;

export function connectSnowflake(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (connected) {
      resolve();
      return;
    }

    connection.connect((err) => {
      if (err) {
        console.error("Snowflake connection error:", err);
        reject(err);
        return;
      }

      connected = true;
      console.log("Connected to Snowflake!");
      resolve();
    });
  });
}

export async function querySnowflake(
  sqlText: string,
  binds: any[] = []
): Promise<any[]> {
  await connectSnowflake();

  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText,
      binds,
      complete: (err, stmt, rows) => {
        if (err) {
          console.error("Snowflake query error:", err);
          reject(err);
          return;
        }

        resolve(rows ?? []);
      },
    });
  });
}