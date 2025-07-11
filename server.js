// ФАЙЛ SERVER.JS 
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 1337;
const ExcelJS = require('exceljs');
const bcrypt = require('bcrypt');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error('Ошибка подключения к базе данных:', err);
    else console.log('Подключено к базе данных SQLite');
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'Диспетчер'
        )`);

    // Добавление пользователя EGOR с ролью "Администратор"
    db.get('SELECT * FROM users WHERE username = ?', ['EGOR'], (err, row) => {
        if (!row) {
            db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                ['EGOR', '123', 'Администратор'], (err) => {
                    if (err) console.error('Ошибка при добавлении EGOR:', err);
                });
        }
    });
    db.run(`
        CREATE TABLE IF NOT EXISTS cargo (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            sender TEXT NOT NULL,
            receiver TEXT NOT NULL,
            routeId INTEGER,
            handlingCost REAL DEFAULT 0,
            FOREIGN KEY (routeId) REFERENCES routes(id)
        )`);
    db.run(`
        CREATE TABLE IF NOT EXISTS staff (
            id INTEGER PRIMARY KEY,
            fullName TEXT NOT NULL,
            position TEXT NOT NULL,
            hireDate TEXT NOT NULL,
            status TEXT NOT NULL,
            salary REAL DEFAULT 0
        )`);
    db.run(`
        CREATE TABLE IF NOT EXISTS transport (
            id INTEGER PRIMARY KEY,
            type TEXT NOT NULL,
            model TEXT NOT NULL,
            licensePlate TEXT NOT NULL,
            status TEXT NOT NULL,
            driverId INTEGER,
            maintenanceCost REAL DEFAULT 0,
            FOREIGN KEY (driverId) REFERENCES staff(id)
        )`);
    db.run(`
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY,
            type TEXT NOT NULL,
            creationDate TEXT NOT NULL,
            reportPeriod TEXT NOT NULL,
            authorId INTEGER,
            status TEXT NOT NULL,
            FOREIGN KEY (authorId) REFERENCES staff(id)
        )`);
    db.run(`
        CREATE TABLE IF NOT EXISTS routes (
            id INTEGER PRIMARY KEY,
            transportId INTEGER NOT NULL,
            startPoint TEXT NOT NULL,
            endPoint TEXT NOT NULL,
            estimatedTime TEXT NOT NULL,
            actualTime TEXT,
            status TEXT NOT NULL,
            revenue REAL DEFAULT 0,
            FOREIGN KEY (transportId) REFERENCES transport(id)
        )`);
});

// Функция для поиска минимального свободного ID
function getNextAvailableId(table, callback) {
    db.all(`SELECT id FROM ${table} ORDER BY id`, (err, rows) => {
        if (err) return callback(err);
        let nextId = 1;
        for (let row of rows) {
            if (row.id === nextId) nextId++;
            else break;
        }
        callback(null, nextId);
    });
}

// Функция для обновления ID после удаления
function updateIdsAfterDelete(table, deletedId, callback) {
    db.all(`SELECT * FROM ${table} WHERE id > ? ORDER BY id ASC`, [deletedId], (err, rows) => {
        if (err) return callback(err);
        const updates = rows.map((row, index) => {
            const newId = deletedId + index;
            return new Promise((resolve, reject) => {
                db.run(`UPDATE ${table} SET id = ? WHERE id = ?`, [newId, row.id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
        Promise.all(updates).then(() => callback(null)).catch(callback);
    });
}

// Функция для обновления внешних ключей
function updateForeignKeysAfterDelete(referencingTable, foreignKey, referencedTable, deletedId, callback) {
    db.all(`SELECT * FROM ${referencingTable} WHERE ${foreignKey} > ?`, [deletedId], (err, rows) => {
        if (err) return callback(err);
        const updates = rows.map(row => {
            const newForeignKey = row[foreignKey] - 1;
            return new Promise((resolve, reject) => {
                db.run(`UPDATE ${referencingTable} SET ${foreignKey} = ? WHERE id = ?`, [newForeignKey, row.id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
        Promise.all(updates).then(() => callback(null)).catch(callback);
    });
}

app.use((req, res, next) => {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    next();
});

// Пользователи

// Получение списка пользователей с ролями
app.get('/users', (req, res) => {
    const searchQuery = req.query.search || '';
    const sql = 'SELECT id, username, role FROM users WHERE CAST(id AS TEXT) LIKE ? OR username LIKE ? OR role LIKE ?';
    const params = [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`];
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ message: 'Ошибка при получении данных' });
        res.json(rows);
    });
});

// Добавление нового пользователя
app.post('/users', async (req, res) => {
    const { username, password, role } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, row) => {
        if (err) return res.status(500).json({ message: 'Ошибка сервера' });
        if (row) return res.status(400).json({ message: 'Пользователь уже существует' });
        getNextAvailableId('users', async (err, nextId) => {
            if (err) return res.status(500).json({ message: 'Ошибка сервера' });
            const userRole = ['Администратор', 'Менеджер', 'Диспетчер'].includes(role) ? role : 'Диспетчер';
            const hashedPassword = await bcrypt.hash(password, 10); // Hash with salt, cost factor 10
            db.run('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)',
                [nextId, username, hashedPassword, userRole], (err) => {
                    if (err) return res.status(500).json({ message: 'Ошибка при добавлении пользователя' });
                    res.json({ message: 'Пользователь добавлен', user: { id: nextId, username, role: userRole } });
                });
        });
    });
});

// Обновление пользователя с проверкой роли текущего пользователя
app.put('/users/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const { username, password, role, currentUserRole } = req.body;
    if (currentUserRole !== 'Администратор') {
        return res.status(403).json({ message: 'Доступ запрещен: только администраторы могут редактировать пользователей' });
    }
    db.get('SELECT * FROM users WHERE id = ?', [id], async (err, row) => {
        if (err) return res.status(500).json({ message: 'Ошибка сервера' });
        if (!row) return res.status(404).json({ message: 'Пользователь не найден' });
        const updatedUsername = username || row.username;
        const updatedPassword = password ? await bcrypt.hash(password, 10) : row.password; // Hash only if new password provided
        const updatedRole = ['Администратор', 'Менеджер', 'Диспетчер'].includes(role) ? role : row.role;
        db.run('UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?',
            [updatedUsername, updatedPassword, updatedRole, id], function (err) {
                if (err) return res.status(500).json({ message: 'Ошибка при обновлении' });
                res.json({ message: 'Пользователь обновлен', user: { id, username: updatedUsername, role: updatedRole } });
            });
    });
});

// Удаление пользователя с проверкой роли
app.delete('/users/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const currentUserRole = req.query.currentUserRole; // Получаем роль через query-параметр
    if (currentUserRole !== 'Администратор') {
        return res.status(403).json({ message: 'Доступ запрещен: только администраторы могут удалять пользователей' });
    }
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ message: 'Ошибка сервера' });
        if (!row) return res.status(404).json({ message: 'Пользователь не найден' });
        db.run('DELETE FROM users WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json({ message: 'Ошибка при удалении' });
            updateIdsAfterDelete('users', id, (err) => {
                if (err) console.error('Ошибка при обновлении ID в users:', err);
                res.json({ message: 'Пользователь удален', user: row });
            });
        });
    });
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, row) => {
        if (err) return res.status(500).json({ message: 'Ошибка сервера' });
        if (row) return res.status(400).json({ message: 'Пользователь уже существует' });
        const hashedPassword = await bcrypt.hash(password, 10); // Hash with salt, cost factor 10
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
            if (err) return res.status(500).json({ message: 'Ошибка при регистрации' });
            res.json({ message: 'Регистрация успешна!' });
        });
    });
});

db.all('SELECT id, password FROM users', async (err, rows) => {
    if (err) {
        console.error('Ошибка при получении пользователей:', err);
        return;
    }
    for (const row of rows) {
        // Check if the password is already hashed (bcrypt hashes start with $)
        if (!row.password.startsWith('$')) {
            const hashedPassword = await bcrypt.hash(row.password, 10);
            db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, row.id], (err) => {
                if (err) console.error(`Ошибка при обновлении пароля для ID ${row.id}:`, err);
                else console.log(`Пароль для ID ${row.id} успешно обновлен`);
            });
        }
    }
});

// Логин с возвратом роли
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, row) => {
        if (err) return res.status(500).json({ message: 'Ошибка сервера' });
        if (!row) return res.status(401).json({ message: 'Неверный логин или пароль' });
        const match = await bcrypt.compare(password, row.password); // Compare plaintext with hash
        if (match) {
            res.json({ message: 'Вход выполнен успешно!', role: row.role });
        } else {
            res.status(401).json({ message: 'Неверный логин или пароль' });
        }
    });
});

// Грузы
app.get('/cargo', (req, res) => {
    const searchQuery = req.query.search || '';
    const sql = `
        SELECT c.*, r.id as routeId, r.status as routeStatus 
        FROM cargo c 
        LEFT JOIN routes r ON c.routeId = r.id 
        WHERE 
            CAST(c.id AS TEXT) LIKE ? OR 
            c.name LIKE ? OR 
            c.type LIKE ? OR 
            c.sender LIKE ? OR 
            c.receiver LIKE ? OR 
            CAST(c.routeId AS TEXT) LIKE ?
    `;
    const params = [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`];
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ message: 'Ошибка при получении данных' });
        res.json(rows);
    });
});

app.post('/cargo', (req, res) => {
    const { name, type, sender, receiver, routeId, handlingCost } = req.body;
    getNextAvailableId('cargo', (err, nextId) => {
        if (err) return res.status(500).json({ message: 'Ошибка сервера' });
        db.run('INSERT INTO cargo (id, name, type, sender, receiver, routeId, handlingCost) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nextId, name, type, sender, receiver, routeId, handlingCost || 0], function (err) {
                if (err) return res.status(500).json({ message: 'Ошибка при добавлении груза' });
                res.json({ message: 'Груз добавлен', cargo: { id: nextId, name, type, sender, receiver, routeId, handlingCost: handlingCost || 0 } });
            });
    });
});

app.put('/cargo/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { name, type, sender, receiver, routeId, handlingCost } = req.body;
    db.run('UPDATE cargo SET name = ?, type = ?, sender = ?, receiver = ?, routeId = ?, handlingCost = ? WHERE id = ?',
        [name, type, sender, receiver, routeId, handlingCost || 0, id], function (err) {
            if (err) return res.status(500).json({ message: 'Ошибка при обновлении' });
            if (this.changes === 0) return res.status(404).json({ message: 'Груз не найден' });
            res.json({ message: 'Груз обновлен', cargo: { id, name, type, sender, receiver, routeId, handlingCost: handlingCost || 0 } });
        });
});

app.delete('/cargo/:id', (req, res) => {
    const id = parseInt(req.params.id);
    db.get('SELECT * FROM cargo WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ message: 'Ошибка сервера' });
        if (!row) return res.status(404).json({ message: 'Груз не найден' });
        db.run('DELETE FROM cargo WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json({ message: 'Ошибка при удалении' });
            updateIdsAfterDelete('cargo', id, (err) => {
                if (err) console.error('Ошибка при обновлении ID в cargo:', err);
                res.json({ message: 'Груз удален', cargo: row });
            });
        });
    });
});

// Персонал
app.get('/staff', (req, res) => {
    const searchQuery = req.query.search || '';
    const statusFilter = req.query.status ? req.query.status.split(',') : [];
    const positionFilter = req.query.position || '';
    let sql = `
        SELECT * FROM staff 
        WHERE 
            CAST(id AS TEXT) LIKE ? OR 
            fullName LIKE ? OR 
            position LIKE ? OR 
            hireDate LIKE ? OR 
            status LIKE ?
    `;
    let params = [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`];

    if (statusFilter.length > 0) {
        sql += ` AND status IN (${statusFilter.map(() => '?').join(',')})`;
        params.push(...statusFilter);
    }
    if (positionFilter) {
        sql += ` AND position = ?`;
        params.push(positionFilter);
    }

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ message: 'Ошибка при получении данных' });
        res.json(rows);
    });
});

app.post('/staff', (req, res) => {
    const { fullName, position, hireDate, status, salary } = req.body;
    getNextAvailableId('staff', (err, nextId) => {
        if (err) return res.status(500).json({ message: 'Ошибка сервера' });
        db.run('INSERT INTO staff (id, fullName, position, hireDate, status, salary) VALUES (?, ?, ?, ?, ?, ?)',
            [nextId, fullName, position, hireDate, status, salary || 0], function (err) {
                if (err) return res.status(500).json({ message: 'Ошибка при добавлении сотрудника' });
                res.json({ message: 'Сотрудник добавлен', staff: { id: nextId, fullName, position, hireDate, status, salary: salary || 0 } });
            });
    });
});

app.put('/staff/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { fullName, position, hireDate, status, salary } = req.body;
    db.run('UPDATE staff SET fullName = ?, position = ?, hireDate = ?, status = ?, salary = ? WHERE id = ?',
        [fullName, position, hireDate, status, salary || 0, id], function (err) {
            if (err) return res.status(500).json({ message: 'Ошибка при обновлении' });
            if (this.changes === 0) return res.status(404).json({ message: 'Сотрудник не найден' });

            if (status === 'уволен' || status === 'в отпуске') {
                db.run('UPDATE transport SET driverId = NULL WHERE driverId = ?', [id], (err) => {
                    if (err) console.error('Ошибка при обновлении транспорта:', err);
                });
                db.run('UPDATE reports SET authorId = NULL WHERE authorId = ?', [id], (err) => {
                    if (err) console.error('Ошибка при обновлении отчётов:', err);
                });
            }

            res.json({ message: 'Сотрудник обновлен', staff: { id, fullName, position, hireDate, status, salary: salary || 0 } });
        });
});

app.delete('/staff/:id', (req, res) => {
    const id = parseInt(req.params.id);
    db.get('SELECT * FROM staff WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ message: 'Ошибка сервера' });
        if (!row) return res.status(404).json({ message: 'Сотрудник не найден' });
        db.run('DELETE FROM staff WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json({ message: 'Ошибка при удалении' });
            updateIdsAfterDelete('staff', id, (err) => {
                if (err) console.error('Ошибка при обновлении ID в staff:', err);
                updateForeignKeysAfterDelete('transport', 'driverId', 'staff', id, (err) => {
                    if (err) console.error('Ошибка при обновлении driverId в transport:', err);
                    updateForeignKeysAfterDelete('reports', 'authorId', 'staff', id, (err) => {
                        if (err) console.error('Ошибка при обновлении authorId в reports:', err);
                        res.json({ message: 'Сотрудник удален', staff: row });
                    });
                });
            });
        });
    });
});

// Транспорт
app.get('/transport', (req, res) => {
    const searchQuery = req.query.search || '';
    const statusFilter = req.query.status ? req.query.status.split(',') : [];
    let sql = `
        SELECT t.*, s.fullName as driver 
        FROM transport t 
        LEFT JOIN staff s ON t.driverId = s.id 
        WHERE 
            CAST(t.id AS TEXT) LIKE ? OR 
            t.type LIKE ? OR 
            t.model LIKE ? OR 
            t.licensePlate LIKE ? OR 
            t.status LIKE ? OR 
            s.fullName LIKE ? OR 
            CAST(t.driverId AS TEXT) LIKE ?
    `;
    let params = [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`];

    if (statusFilter.length > 0) {
        sql += ` AND t.status IN (${statusFilter.map(() => '?').join(',')})`;
        params.push(...statusFilter);
    }

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ message: 'Ошибка при получении данных' });
        res.json(rows.map(row => ({ ...row, driver: row.driver || null })));
    });
});

app.post('/transport', (req, res) => {
    const { type, model, licensePlate, status, driver, maintenanceCost } = req.body;
    if (status === 'в работе') {
        return res.status(400).json({ message: 'Статус "в работе" нельзя устанавливать вручную' });
    }
    if (driver) {
        db.get('SELECT id, status FROM staff WHERE fullName = ? AND position = "Водитель"', [driver], (err, row) => {
            if (err) return res.status(500).json({ message: 'Ошибка сервера' });
            if (!row) return res.status(400).json({ message: 'Водитель не найден или не является водителем' });
            if (row.status !== 'активный') return res.status(400).json({ message: 'Нельзя назначить водителя со статусом "уволен" или "в отпуске"' });
            const driverId = row.id;
            getNextAvailableId('transport', (err, nextId) => {
                if (err) return res.status(500).json({ message: 'Ошибка сервера' });
                db.run('INSERT INTO transport (id, type, model, licensePlate, status, driverId, maintenanceCost) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [nextId, type, model, licensePlate, status, driverId, maintenanceCost || 0], function (err) {
                        if (err) return res.status(500).json({ message: 'Ошибка при добавлении транспорта' });
                        res.json({ message: 'Транспорт добавлен', transport: { id: nextId, type, model, licensePlate, status, driver, maintenanceCost: maintenanceCost || 0 } });
                    });
            });
        });
    } else {
        getNextAvailableId('transport', (err, nextId) => {
            if (err) return res.status(500).json({ message: 'Ошибка сервера' });
            db.run('INSERT INTO transport (id, type, model, licensePlate, status, driverId, maintenanceCost) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [nextId, type, model, licensePlate, status, null, maintenanceCost || 0], function (err) {
                    if (err) return res.status(500).json({ message: 'Ошибка при добавлении транспорта' });
                    res.json({ message: 'Транспорт добавлен', transport: { id: nextId, type, model, licensePlate, status, driver: null, maintenanceCost: maintenanceCost || 0 } });
                });
        });
    }
});

app.put('/transport/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { type, model, licensePlate, status, driver, maintenanceCost } = req.body;
    if (status === 'в работе') {
        return res.status(400).json({ message: 'Статус "в работе" нельзя устанавливать вручную' });
    }
    if (driver) {
        db.get('SELECT id, status FROM staff WHERE fullName = ? AND position = "Водитель"', [driver], (err, row) => {
            if (err) return res.status(500).json({ message: 'Ошибка сервера' });
            if (!row) return res.status(400).json({ message: 'Водитель не найден или не является водителем' });
            if (row.status !== 'активный') return res.status(400).json({ message: 'Нельзя назначить водителя со статусом "уволен" или "в отпуске"' });
            const driverId = row.id;
            db.run('UPDATE transport SET type = ?, model = ?, licensePlate = ?, status = ?, driverId = ?, maintenanceCost = ? WHERE id = ?',
                [type, model, licensePlate, status, driverId, maintenanceCost || 0, id], function (err) {
                    if (err) return res.status(500).json({ message: 'Ошибка при обновлении' });
                    if (this.changes === 0) return res.status(404).json({ message: 'Транспорт не найден' });
                    res.json({ message: 'Транспорт обновлен', transport: { id, type, model, licensePlate, status, driver, maintenanceCost: maintenanceCost || 0 } });
                });
        });
    } else {
        db.run('UPDATE transport SET type = ?, model = ?, licensePlate = ?, status = ?, driverId = ?, maintenanceCost = ? WHERE id = ?',
            [type, model, licensePlate, status, null, maintenanceCost || 0, id], function (err) {
                if (err) return res.status(500).json({ message: 'Ошибка при обновлении' });
                if (this.changes === 0) return res.status(404).json({ message: 'Транспорт не найден' });
                res.json({ message: 'Транспорт обновлен', transport: { id, type, model, licensePlate, status, driver: null, maintenanceCost: maintenanceCost || 0 } });
            });
    }
});

app.delete('/transport/:id', (req, res) => {
    const id = parseInt(req.params.id);
    db.get('SELECT * FROM transport WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ message: 'Ошибка сервера' });
        if (!row) return res.status(404).json({ message: 'Транспорт не найден' });
        db.run('DELETE FROM transport WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json({ message: 'Ошибка при удалении' });
            updateIdsAfterDelete('transport', id, (err) => {
                if (err) console.error('Ошибка при обновлении ID в transport:', err);
                updateForeignKeysAfterDelete('routes', 'transportId', 'transport', id, (err) => {
                    if (err) console.error('Ошибка при обновлении transportId в routes:', err);
                    res.json({ message: 'Транспорт удален', transport: row });
                });
            });
        });
    });
});

// Отчеты


app.use('/reports', (req, res, next) => {
    const currentUserRole = req.query.currentUserRole || req.body.currentUserRole;
    if (!['Менеджер', 'Администратор'].includes(currentUserRole)) {
        return res.status(403).json({ message: 'Доступ запрещен: только менеджеры и администраторы могут работать с отчётами' });
    }
    next();
});
app.get('/reports', (req, res) => {
    const searchQuery = req.query.search || '';
    const sql = `
        SELECT r.*, s.fullName as author 
        FROM reports r 
        LEFT JOIN staff s ON r.authorId = s.id 
        WHERE 
            CAST(r.id AS TEXT) LIKE ? OR 
            r.type LIKE ? OR 
            r.creationDate LIKE ? OR 
            r.reportPeriod LIKE ? OR 
            s.fullName LIKE ? OR 
            r.status LIKE ? OR 
            CAST(r.authorId AS TEXT) LIKE ?
    `;
    const params = [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`];
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ message: 'Ошибка при получении данных' });
        res.json(rows.map(row => ({ ...row, author: row.author || null })));
    });
});

app.post('/reports', (req, res) => {
    const { type, creationDate, reportPeriod, author, status } = req.body;
    db.get('SELECT id FROM staff WHERE fullName = ? AND position = "Менеджер по логистике"', [author], (err, row) => {
        if (err) return res.status(500).json({ message: 'Ошибка сервера' });
        const authorId = row ? row.id : null;
        getNextAvailableId('reports', (err, nextId) => {
            if (err) return res.status(500).json({ message: 'Ошибка сервера' });
            db.run('INSERT INTO reports (id, type, creationDate, reportPeriod, authorId, status) VALUES (?, ?, ?, ?, ?, ?)',
                [nextId, type, creationDate, reportPeriod, authorId, status], function (err) {
                    if (err) return res.status(500).json({ message: 'Ошибка при добавлении отчета' });
                    res.json({ message: 'Отчет добавлен', report: { id: nextId, type, creationDate, reportPeriod, author, status } });
                });
        });
    });
});

app.put('/reports/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { type, creationDate, reportPeriod, author, status } = req.body;
    db.get('SELECT id FROM staff WHERE fullName = ? AND position = "Менеджер по логистике"', [author], (err, row) => {
        if (err) return res.status(500).json({ message: 'Ошибка сервера' });
        const authorId = row ? row.id : null;
        db.run('UPDATE reports SET type = ?, creationDate = ?, reportPeriod = ?, authorId = ?, status = ? WHERE id = ?',
            [type, creationDate, reportPeriod, authorId, status, id], function (err) {
                if (err) return res.status(500).json({ message: 'Ошибка при обновлении' });
                if (this.changes === 0) return res.status(404).json({ message: 'Отчет не найден' });
                res.json({ message: 'Отчет обновлен', report: { id, type, creationDate, reportPeriod, author, status } });
            });
    });
});

app.delete('/reports/:id', (req, res) => {
    const id = parseInt(req.params.id);
    db.get('SELECT * FROM reports WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ message: 'Ошибка сервера' });
        if (!row) return res.status(404).json({ message: 'Отчет не найден' });
        db.run('DELETE FROM reports WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json({ message: 'Ошибка при удалении' });
            updateIdsAfterDelete('reports', id, (err) => {
                if (err) console.error('Ошибка при обновлении ID в reports:', err);
                res.json({ message: 'Отчет удален', report: row });
            });
        });
    });
});

// Маршруты
app.get('/routes', (req, res) => {
    const searchQuery = req.query.search || '';
    const sql = `
        SELECT * FROM routes 
        WHERE 
            CAST(id AS TEXT) LIKE ? OR 
            CAST(transportId AS TEXT) LIKE ? OR 
            startPoint LIKE ? OR 
            endPoint LIKE ? OR 
            estimatedTime LIKE ? OR 
            actualTime LIKE ? OR 
            status LIKE ?
    `;
    const params = [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`];
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ message: 'Ошибка при получении данных' });
        res.json(rows);
    });
});

app.post('/routes', (req, res) => {
    const { transportId, startPoint, endPoint, estimatedTime, actualTime, status, revenue } = req.body;
    db.get('SELECT * FROM transport WHERE id = ? AND status IN (?, ?)', [transportId, 'в работе', 'свободен'], (err, transport) => {
        if (err) return res.status(500).json({ message: 'Ошибка сервера' });
        if (!transport) return res.status(400).json({ message: 'Неверный транспорт или транспорт на ремонте' });
        getNextAvailableId('routes', (err, nextId) => {
            if (err) return res.status(500).json({ message: 'Ошибка сервера' });
            db.run('UPDATE transport SET status = ? WHERE id = ?', ['в работе', transportId], (err) => {
                if (err) return res.status(500).json({ message: 'Ошибка при обновлении статуса транспорта' });
                db.run('INSERT INTO routes (id, transportId, startPoint, endPoint, estimatedTime, actualTime, status, revenue) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [nextId, transportId, startPoint, endPoint, estimatedTime, actualTime || null, status, revenue || 0], function (err) {
                        if (err) return res.status(500).json({ message: 'Ошибка при добавлении маршрута' });
                        res.json({ message: 'Маршрут добавлен', route: { id: nextId, transportId, startPoint, endPoint, estimatedTime, actualTime, status, revenue: revenue || 0 } });
                    });
            });
        });
    });
});

app.put('/routes/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { transportId, startPoint, endPoint, estimatedTime, actualTime, status, revenue } = req.body;
    db.get('SELECT * FROM transport WHERE id = ? AND status IN (?, ?)', [transportId, 'в работе', 'свободен'], (err, transport) => {
        if (err) return res.status(500).json({ message: 'Ошибка сервера' });
        if (!transport) return res.status(400).json({ message: 'Неверный транспорт или транспорт на ремонте' });
        // Получить текущий маршрут, чтобы узнать предыдущий transportId
        db.get('SELECT transportId FROM routes WHERE id = ?', [id], (err, route) => {
            if (err) return res.status(500).json({ message: 'Ошибка сервера' });
            if (!route) return res.status(404).json({ message: 'Маршрут не найден' });
            const oldTransportId = route.transportId;
            // Обновить статус нового транспорта на "в работе", если маршрут не "доставлен" или "отменен"
            if (status !== 'доставлен' && status !== 'отменен') {
                db.run('UPDATE transport SET status = ? WHERE id = ?', ['в работе', transportId], (err) => {
                    if (err) return res.status(500).json({ message: 'Ошибка при обновлении статуса транспорта' });
                    // Продолжить обновление маршрута
                    updateRouteAndHandleOldTransport(id, transportId, oldTransportId, startPoint, endPoint, estimatedTime, actualTime, status, revenue, res);
                });
            } else {
                // Если статус "доставлен" или "отменен", проверить, используется ли транспорт в других маршрутах
                db.get('SELECT COUNT(*) as count FROM routes WHERE transportId = ? AND id != ? AND status NOT IN (?, ?)', [transportId, id, 'доставлен', 'отменен'], (err, row) => {
                    if (err) return res.status(500).json({ message: 'Ошибка сервера' });
                    if (row.count === 0) {
                        db.run('UPDATE transport SET status = ? WHERE id = ?', ['свободен', transportId], (err) => {
                            if (err) console.error('Ошибка при обновлении статуса транспорта:', err);
                        });
                    }
                    // Проверить, используется ли старый транспорт в других маршрутах
                    if (oldTransportId && oldTransportId !== transportId) {
                        db.get('SELECT COUNT(*) as count FROM routes WHERE transportId = ? AND id != ? AND status NOT IN (?, ?)', [oldTransportId, id, 'доставлен', 'отменен'], (err, row) => {
                            if (err) return res.status(500).json({ message: 'Ошибка сервера' });
                            if (row.count === 0) {
                                db.run('UPDATE transport SET status = ? WHERE id = ?', ['свободен', oldTransportId], (err) => {
                                    if (err) console.error('Ошибка при обновлении статуса старого транспорта:', err);
                                });
                            }
                            // Выполнить обновление маршрута
                            updateRouteAndHandleOldTransport(id, transportId, oldTransportId, startPoint, endPoint, estimatedTime, actualTime, status, revenue, res);
                        });
                    } else {
                        // Выполнить обновление маршрута, если транспорт не изменился
                        updateRouteAndHandleOldTransport(id, transportId, oldTransportId, startPoint, endPoint, estimatedTime, actualTime, status, revenue, res);
                    }
                });
            }
        });
    });
});

// Вспомогательная функция для обновления маршрута
function updateRouteAndHandleOldTransport(id, transportId, oldTransportId, startPoint, endPoint, estimatedTime, actualTime, status, revenue, res) {
    db.run('UPDATE routes SET transportId = ?, startPoint = ?, endPoint = ?, estimatedTime = ?, actualTime = ?, status = ?, revenue = ? WHERE id = ?',
        [transportId, startPoint, endPoint, estimatedTime, actualTime || null, status, revenue || 0, id], function (err) {
            if (err) return res.status(500).json({ message: 'Ошибка при обновлении' });
            if (this.changes === 0) return res.status(404).json({ message: 'Маршрут не найден' });
            res.json({ message: 'Маршрут обновлен', route: { id, transportId, startPoint, endPoint, estimatedTime, actualTime, status, revenue: revenue || 0 } });
        });
}

app.delete('/routes/:id', (req, res) => {
    const id = parseInt(req.params.id);
    db.get('SELECT * FROM routes WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ message: 'Ошибка сервера' });
        if (!row) return res.status(404).json({ message: 'Маршрут не найден' });
        const transportId = row.transportId;
        db.run('DELETE FROM routes WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json({ message: 'Ошибка при удалении' });
            // Проверить, используется ли транспорт в других маршрутах
            db.get('SELECT COUNT(*) as count FROM routes WHERE transportId = ?', [transportId], (err, countRow) => {
                if (err) return res.status(500).json({ message: 'Ошибка сервера' });
                if (countRow.count === 0) {
                    db.run('UPDATE transport SET status = ? WHERE id = ?', ['свободен', transportId], (err) => {
                        if (err) console.error('Ошибка при обновлении статуса транспорта:', err);
                    });
                }
                updateIdsAfterDelete('routes', id, (err) => {
                    if (err) console.error('Ошибка при обновлении ID в routes:', err);
                    updateForeignKeysAfterDelete('cargo', 'routeId', 'routes', id, (err) => {
                        if (err) console.error('Ошибка при обновлении routeId в cargo:', err);
                        res.json({ message: 'Маршрут удален', route: row });
                    });
                });
            });
        });
    });
});

// Генерация и экспорт отчетов (без изменений)
// Генерация отчета с модификаторами затрат
app.get('/generate-report', (req, res) => {
    const currentUserRole = req.query.currentUserRole;
    if (!['Менеджер', 'Администратор'].includes(currentUserRole)) {
        return res.status(403).json({ message: 'Доступ запрещен: только менеджеры и администраторы могут генерировать отчёты' });
    }

    const cargoCostModifiers = {
        'обычный': 1.0,
        'опасный': 1.3,
        'скоропортящийся': 1.15
    };

    const transportCostModifiers = {
        'грузовик': 1.0,
        'поезд': 1.2,
        'самолет': 1.5
    };

    const transportStatusModifiers = {
        'в работе': 1.2,
        'на ремонте': 1.5,
        'свободен': 1.0
    };

    const staffStatusModifiers = {
        'уволен': 0.0, // -100% (не учитывается)
        'активный': 1.0,
        'в отпуске': 1.0
    };

    const routeStatusModifiers = {
        'отменен': 0.0, // -100% (не учитывается)
        'в пути': 1.0,
        'доставлен': 1.0
    };

    const report = {};

    // Расчёт общей зарплаты сотрудников с учётом статуса
    db.all('SELECT salary, status FROM staff WHERE status != ?', ['уволен'], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Ошибка при расчете зарплат' });
        report.totalSalary = rows.reduce((sum, row) => {
            const modifier = staffStatusModifiers[row.status.toLowerCase()] || 1.0;
            return sum + (row.salary || 0) * modifier;
        }, 0);

        // Расчёт затрат на транспорт с учётом типа и статуса
        db.all('SELECT maintenanceCost, type, status FROM transport', (err, rows) => {
            if (err) return res.status(500).json({ message: 'Ошибка при расчете затрат на транспорт' });
            report.totalMaintenance = rows.reduce((sum, row) => {
                const typeModifier = transportCostModifiers[row.type.toLowerCase()] || 1.0;
                const statusModifier = transportStatusModifiers[row.status.toLowerCase()] || 1.0;
                return sum + (row.maintenanceCost || 0) * typeModifier * statusModifier;
            }, 0);

            // Расчёт затрат на грузы с учётом типа
            db.all('SELECT handlingCost, type FROM cargo', (err, rows) => {
                if (err) return res.status(500).json({ message: 'Ошибка при расчете затрат на грузы' });
                report.totalHandling = rows.reduce((sum, row) => {
                    const modifier = cargoCostModifiers[row.type] || 1.0;
                    return sum + (row.handlingCost || 0) * modifier;
                }, 0);

                // Расчёт доходов от маршрутов с учётом статуса
                db.all('SELECT revenue, status FROM routes WHERE status != ?', ['отменен'], (err, rows) => {
                    if (err) return res.status(500).json({ message: 'Ошибка при расчете доходов' });
                    report.totalRevenue = rows.reduce((sum, row) => {
                        const modifier = routeStatusModifiers[row.status.toLowerCase()] || 1.0;
                        return sum + (row.revenue || 0) * modifier;
                    }, 0);

                    report.totalExpenses = report.totalSalary + report.totalMaintenance + report.totalHandling;
                    report.profit = report.totalRevenue - report.totalExpenses;

                    // Статистика по сотрудникам (исключаем уволенных)
                    db.all('SELECT position, COUNT(*) as count, AVG(salary) as avgSalary FROM staff WHERE status != ? GROUP BY position', ['уволен'], (err, rows) => {
                        if (err) return res.status(500).json({ message: 'Ошибка при расчете статистики сотрудников' });
                        report.staffStats = rows;

                        // Статистика по транспорту с модификаторами
                        db.all('SELECT type, COUNT(*) as count, AVG(maintenanceCost) as avgCost FROM transport GROUP BY type', (err, rows) => {
                            if (err) return res.status(500).json({ message: 'Ошибка при расчете статистики транспорта' });
                            report.transportStats = rows.map(stat => ({
                                ...stat,
                                avgCost: (stat.avgCost || 0) * (transportCostModifiers[stat.type.toLowerCase()] || 1.0)
                            }));

                            // Статистика по грузам с модификаторами
                            db.all('SELECT type, COUNT(*) as count, AVG(handlingCost) as avgCost FROM cargo GROUP BY type', (err, rows) => {
                                if (err) return res.status(500).json({ message: 'Ошибка при расчете статистики грузов' });
                                report.cargoStats = rows.map(stat => ({
                                    ...stat,
                                    avgCost: (stat.avgCost || 0) * (cargoCostModifiers[stat.type] || 1.0)
                                }));

                                // Статистика по маршрутам (исключаем отменённые)
                                db.all('SELECT status, COUNT(*) as count, AVG(revenue) as avgRevenue FROM routes WHERE status != ? GROUP BY status', ['отменен'], (err, rows) => {
                                    if (err) return res.status(500).json({ message: 'Ошибка при расчете статистики маршрутов' });
                                    report.routesStats = rows;
                                    res.json(report);
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

db.all('SELECT id, password FROM users', async (err, rows) => {
    if (err) {
        console.error('Ошибка при получении пользователей:', err);
        return;
    }
    for (const row of rows) {
        // Check if the password is already hashed (bcrypt hashes start with $)
        if (!row.password.startsWith('$')) {
            const hashedPassword = await bcrypt.hash(row.password, 10);
            db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, row.id], (err) => {
                if (err) console.error(`Ошибка при обновлении пароля для ID ${row.id}:`, err);
                else console.log(`Пароль для ID ${row.id} успешно обновлен`);
            });
        }
    }
});
// Экспорт отчета в Excel с модификаторами затрат
app.get('/export-report', (req, res) => {
    const currentUserRole = req.query.currentUserRole;
    if (!['Менеджер', 'Администратор'].includes(currentUserRole)) {
        return res.status(403).json({ message: 'Доступ запрещен: только менеджеры и администраторы могут экспортировать отчёты' });
    }

    const cargoCostModifiers = {
        'обычный': 1.0,
        'опасный': 1.3,
        'скоропортящийся': 1.15
    };

    const transportCostModifiers = {
        'грузовик': 1.0,
        'поезд': 1.2,
        'самолет': 1.5
    };

    const transportStatusModifiers = {
        'в работе': 1.2,
        'на ремонте': 1.5,
        'свободен': 1.0
    };

    const staffStatusModifiers = {
        'уволен': 0.0, // -100% (не учитывается)
        'активный': 1.0,
        'в отпуске': 1.0
    };

    const routeStatusModifiers = {
        'отменен': 0.0, // -100% (не учитывается)
        'в пути': 1.0,
        'доставлен': 1.0
    };

    db.all('SELECT * FROM staff WHERE status != ?', ['уволен'], (err, staff) => {
        if (err) return res.status(500).json({ message: 'Ошибка при получении данных о сотрудниках' });
        db.all('SELECT * FROM transport', (err, transport) => {
            if (err) return res.status(500).json({ message: 'Ошибка при получении данных о транспорте' });
            db.all('SELECT * FROM cargo', (err, cargo) => {
                if (err) return res.status(500).json({ message: 'Ошибка при получении данных о грузах' });
                db.all('SELECT * FROM routes WHERE status != ?', ['отменен'], (err, routes) => {
                    if (err) return res.status(500).json({ message: 'Ошибка при получении данных о маршрутах' });

                    // Расчёт общей зарплаты сотрудников с учётом статуса
                    const totalSalary = staff.reduce((sum, row) => {
                        const modifier = staffStatusModifiers[row.status.toLowerCase()] || 1.0;
                        return sum + (row.salary || 0) * modifier;
                    }, 0);

                    // Расчёт затрат на транспорт с учётом типа и статуса
                    const totalMaintenance = transport.reduce((sum, row) => {
                        const typeModifier = transportCostModifiers[row.type.toLowerCase()] || 1.0;
                        const statusModifier = transportStatusModifiers[row.status.toLowerCase()] || 1.0;
                        return sum + (row.maintenanceCost || 0) * typeModifier * statusModifier;
                    }, 0);

                    // Расчёт затрат на грузы с учётом типа
                    const totalHandling = cargo.reduce((sum, row) => {
                        const modifier = cargoCostModifiers[row.type] || 1.0;
                        return sum + (row.handlingCost || 0) * modifier;
                    }, 0);

                    // Расчёт доходов от маршрутов с учётом статуса
                    const totalRevenue = routes.reduce((sum, row) => {
                        const modifier = routeStatusModifiers[row.status.toLowerCase()] || 1.0;
                        return sum + (row.revenue || 0) * modifier;
                    }, 0);

                    const totalExpenses = totalSalary + totalMaintenance + totalHandling;
                    const profit = totalRevenue - totalExpenses;

                    db.all('SELECT position, COUNT(*) as count, AVG(salary) as avgSalary FROM staff WHERE status != ? GROUP BY position', ['уволен'], (err, staffStats) => {
                        if (err) return res.status(500).json({ message: 'Ошибка при расчете статистики сотрудников' });
                        db.all('SELECT type, COUNT(*) as count, AVG(maintenanceCost) as avgCost FROM transport GROUP BY type', (err, transportStats) => {
                            if (err) return res.status(500).json({ message: 'Ошибка при расчете статистики транспорта' });
                            transportStats = transportStats.map(stat => ({
                                ...stat,
                                avgCost: (stat.avgCost || 0) * (transportCostModifiers[stat.type.toLowerCase()] || 1.0)
                            }));

                            db.all('SELECT type, COUNT(*) as count, AVG(handlingCost) as avgCost FROM cargo GROUP BY type', (err, cargoStats) => {
                                if (err) return res.status(500).json({ message: 'Ошибка при расчете статистики грузов' });
                                cargoStats = cargoStats.map(stat => ({
                                    ...stat,
                                    avgCost: (stat.avgCost || 0) * (cargoCostModifiers[stat.type] || 1.0)
                                }));

                                db.all('SELECT status, COUNT(*) as count, AVG(revenue) as avgRevenue FROM routes WHERE status != ? GROUP BY status', ['отменен'], (err, routesStats) => {
                                    if (err) return res.status(500).json({ message: 'Ошибка при расчете статистики маршрутов' });
                                    const workbook = new ExcelJS.Workbook();
                                    const staffSheet = workbook.addWorksheet('Сотрудники');
                                    staffSheet.columns = [
                                        { header: 'ID', key: 'id', width: 10 },
                                        { header: 'ФИО', key: 'fullName', width: 20 },
                                        { header: 'Должность', key: 'position', width: 20 },
                                        { header: 'Дата приема', key: 'hireDate', width: 15 },
                                        { header: 'Статус', key: 'status', width: 15 },
                                        { header: 'Зарплата', key: 'salary', width: 15 }
                                    ];
                                    staffSheet.addRows(staff);

                                    const transportSheet = workbook.addWorksheet('Транспорт');
                                    transportSheet.columns = [
                                        { header: 'ID', key: 'id', width: 10 },
                                        { header: 'Тип', key: 'type', width: 15 },
                                        { header: 'Модель', key: 'model', width: 20 },
                                        { header: 'Гос. номер', key: 'licensePlate', width: 15 },
                                        { header: 'Статус', key: 'status', width: 15 },
                                        { header: 'Затраты на обслуживание', key: 'maintenanceCost', width: 20 }
                                    ];
                                    transportSheet.addRows(transport.map(row => ({
                                        ...row,
                                        maintenanceCost: (row.maintenanceCost || 0) *
                                            (transportCostModifiers[row.type.toLowerCase()] || 1.0) *
                                            (transportStatusModifiers[row.status.toLowerCase()] || 1.0)
                                    })));

                                    const cargoSheet = workbook.addWorksheet('Грузы');
                                    cargoSheet.columns = [
                                        { header: 'ID', key: 'id', width: 10 },
                                        { header: 'Название', key: 'name', width: 20 },
                                        { header: 'Тип', key: 'type', width: 15 },
                                        { header: 'Отправитель', key: 'sender', width: 20 },
                                        { header: 'Получатель', key: 'receiver', width: 20 },
                                        { header: 'ID Маршрута', key: 'routeId', width: 10 },
                                        { header: 'Затраты на обработку', key: 'handlingCost', width: 20 }
                                    ];
                                    cargoSheet.addRows(cargo.map(row => ({
                                        ...row,
                                        handlingCost: (row.handlingCost || 0) * (cargoCostModifiers[row.type] || 1.0)
                                    })));

                                    const routesSheet = workbook.addWorksheet('Маршруты');
                                    routesSheet.columns = [
                                        { header: 'ID', key: 'id', width: 10 },
                                        { header: 'ID Транспорта', key: 'transportId', width: 15 },
                                        { header: 'Начальная точка', key: 'startPoint', width: 20 },
                                        { header: 'Конечная точка', key: 'endPoint', width: 20 },
                                        { header: 'Предполагаемое время', key: 'estimatedTime', width: 20 },
                                        { header: 'Фактическое время', key: 'actualTime', width: 20 },
                                        { header: 'Статус', key: 'status', width: 15 },
                                        { header: 'Доход', key: 'revenue', width: 15 }
                                    ];
                                    routesSheet.addRows(routes);

                                    const summarySheet = workbook.addWorksheet('Сводный отчет');
                                    summarySheet.columns = [
                                        { header: 'Показатель', key: 'indicator', width: 40 },
                                        { header: 'Значение', key: 'value', width: 20 }
                                    ];
                                    summarySheet.addRow({ indicator: 'Финансовый отчет', value: '' });
                                    summarySheet.addRow({ indicator: 'Общая зарплата сотрудников', value: totalSalary.toFixed(2) });
                                    summarySheet.addRow({ indicator: 'Общие затраты на транспорт', value: totalMaintenance.toFixed(2) });
                                    summarySheet.addRow({ indicator: 'Общие затраты на грузы', value: totalHandling.toFixed(2) });
                                    summarySheet.addRow({ indicator: 'Общий доход от маршрутов', value: totalRevenue.toFixed(2) });
                                    summarySheet.addRow({ indicator: 'Общие затраты', value: totalExpenses.toFixed(2) });
                                    summarySheet.addRow({ indicator: 'Прибыль', value: profit.toFixed(2) });
                                    summarySheet.addRow({ indicator: 'Статистика по сотрудникам', value: '' });
                                    staffStats.forEach(stat => {
                                        summarySheet.addRow({
                                            indicator: `${stat.position}: ${stat.count} чел., средняя зарплата`,
                                            value: stat.avgSalary.toFixed(2)
                                        });
                                    });
                                    summarySheet.addRow({ indicator: 'Статистика по транспорту', value: '' });
                                    transportStats.forEach(stat => {
                                        summarySheet.addRow({
                                            indicator: `${stat.type}: ${stat.count} ед., средние затраты`,
                                            value: stat.avgCost.toFixed(2)
                                        });
                                    });
                                    summarySheet.addRow({ indicator: 'Статистика по грузам', value: '' });
                                    cargoStats.forEach(stat => {
                                        summarySheet.addRow({
                                            indicator: `${stat.type}: ${stat.count} ед., средние затраты`,
                                            value: stat.avgCost.toFixed(2)
                                        });
                                    });
                                    summarySheet.addRow({ indicator: 'Статистика по маршрутам', value: '' });
                                    routesStats.forEach(stat => {
                                        summarySheet.addRow({
                                            indicator: `${stat.status}: ${stat.count} шт., средний доход`,
                                            value: stat.avgRevenue.toFixed(2)
                                        });
                                    });

                                    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                                    res.setHeader('Content-Disposition', 'attachment; filename=report.xlsx');
                                    workbook.xlsx.write(res).then(() => res.end());
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});
