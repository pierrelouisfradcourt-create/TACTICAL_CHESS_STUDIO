use postgres::{Client, NoTls};

pub fn connect() -> Client {
    Client::connect(
        "host=localhost user=postgres password=postgres dbname=tactical_chess",
        NoTls,
    )
    .expect("DB connection failed")
}
