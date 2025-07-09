const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseConnection {
    constructor() {
        this.db = null;
        this.dbPath = process.env.DB_PATH || path.join(__dirname, 'cyclebees.db');
    }

    connect() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                return resolve(this.db);
            }

            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Failed to connect to database:', err.message);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database at', this.dbPath);
                    // Enable foreign keys for referential integrity
                    this.db.run('PRAGMA foreign_keys = ON');
                    resolve(this.db);
                }
            });
        });
    }

    getDatabase() {
        if (!this.db) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.db;
    }

    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err.message);
                        reject(err);
                    } else {
                        console.log('Database connection closed.');
                        this.db = null;
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    // Helper methods for common database operations
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
}

// Create a singleton instance
const dbConnection = new DatabaseConnection();

module.exports = dbConnection;