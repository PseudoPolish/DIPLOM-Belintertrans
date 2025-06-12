// ФАЙЛ SCRIPT.JS:
// Маппинг классов для цветных индикаторов статусов и типов
const typeClassMap = {
    'обычный': 'secondary',
    'опасный': 'danger',
    'скоропортящийся': 'warning'
};

const statusClassMap = {
    'активный': 'success',
    'в отпуске': 'warning',
    'уволен': 'danger',
    'в работе': 'primary',
    'на ремонте': 'warning',
    'свободен': 'success',
    'в разработке': 'warning',
    'завершен': 'success',
    'утвержден': 'primary',
    'в пути': 'warning',
    'доставлен': 'success',
    'отменен': 'danger'
};

// Компонент ConfirmDeleteModal
const ConfirmDeleteModal = ({ onConfirm, itemId }) => {
    const handleConfirm = () => {
        onConfirm(itemId);
        $('#confirmDeleteModal').modal('hide');
    };

    React.useEffect(() => {
        $('#confirmDeleteModal').on('show.bs.modal', () => {
            $('#tableModal').addClass('modal-dim');
        });
        $('#confirmDeleteModal').on('hidden.bs.modal', () => {
            $('#tableModal').removeClass('modal-dim');
        });
        $('#confirmDeleteButton').off('click').on('click', handleConfirm);

        return () => {
            $('#confirmDeleteModal').off('show.bs.modal');
            $('#confirmDeleteModal').off('hidden.bs.modal');
            $('#confirmDeleteButton').off('click');
        };
    }, [itemId]);

    return null;
};

// Компонент CargoTable
const CargoTable = () => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [cargoData, setCargoData] = React.useState([]);
    const [routes, setRoutes] = React.useState([]);
    const [itemToDelete, setItemToDelete] = React.useState(null);

    const fetchData = async () => {
        const cargoResponse = await fetch(`/cargo?search=${encodeURIComponent(searchQuery)}`);
        const routesResponse = await fetch('/routes');
        const cargoData = await cargoResponse.json();
        const routesData = await routesResponse.json();
        setCargoData(cargoData);
        setRoutes(routesData);
    };

    React.useEffect(() => {
        fetchData();
    }, [searchQuery]);

    const handleSearch = (e) => setSearchQuery(e.target.value);

    const handleInputChange = (id, field, value) => {
        setCargoData(prev => prev.map(item => item.id === id ? { ...item, [field]: field === 'handlingCost' ? parseFloat(value) || 0 : value } : item));
    };

    const updateCargo = async (id) => {
        const cargo = cargoData.find(item => item.id === id);
        await fetch(`/cargo/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cargo)
        });
        fetchData();
    };

    const deleteCargo = async (id) => {
        await fetch(`/cargo/${id}`, { method: 'DELETE' });
        fetchData();
    };

    const confirmDelete = (id) => {
        setItemToDelete(id);
        $('#confirmDeleteModal').modal('show');
    };

    const handleConfirmDelete = () => {
        if (itemToDelete) {
            deleteCargo(itemToDelete);
            setItemToDelete(null);
        }
    };

    const addCargo = () => {
        setCargoData(prev => [...prev, { id: 'new', name: '', type: 'обычный', sender: '', receiver: '', routeId: null, handlingCost: 0 }]);
    };

    const saveNewCargo = async (cargo) => {
        await fetch('/cargo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cargo)
        });
        fetchData();
    };

    const renderRow = (cargo) => {
        if (cargo.id === 'new') {
            return React.createElement('tr', null,
                React.createElement('td', null, 'Авто'),
                React.createElement('td', null, React.createElement('input', {
                    className: 'form-control',
                    value: cargo.name,
                    onChange: (e) => handleInputChange('new', 'name', e.target.value)
                })),
                React.createElement('td', null, React.createElement('select', {
                    className: 'form-control',
                    value: cargo.type,
                    onChange: (e) => handleInputChange('new', 'type', e.target.value)
                }, ['обычный', 'опасный', 'скоропортящийся'].map(opt => React.createElement('option', { value: opt }, opt)))),
                React.createElement('td', null, React.createElement('input', {
                    className: 'form-control',
                    value: cargo.sender,
                    onChange: (e) => handleInputChange('new', 'sender', e.target.value)
                })),
                React.createElement('td', null, React.createElement('input', {
                    className: 'form-control',
                    value: cargo.receiver,
                    onChange: (e) => handleInputChange('new', 'receiver', e.target.value)
                })),
                React.createElement('td', null, React.createElement('select', {
                    className: 'form-control',
                    value: cargo.routeId || '',
                    onChange: (e) => handleInputChange('new', 'routeId', e.target.value ? parseInt(e.target.value) : null)
                }, [React.createElement('option', { value: '' }, 'Без маршрута'), ...routes.map(route => React.createElement('option', { value: route.id }, `Маршрут ${route.id} (${route.status})`))])),
                React.createElement('td', null, React.createElement('input', {
                    type: 'number',
                    className: 'form-control',
                    value: cargo.handlingCost || '',
                    onChange: (e) => handleInputChange('new', 'handlingCost', e.target.value)
                })),
                React.createElement('td', null,
                    React.createElement('button', { className: 'btn btn-success btn-sm', onClick: () => saveNewCargo(cargo) }, 'Сохранить'),
                    React.createElement('button', { className: 'btn btn-secondary btn-sm', onClick: () => setCargoData(prev => prev.filter(item => item.id !== 'new')) }, 'Отмена')
                )
            );
        }
        return React.createElement('tr', null,
            React.createElement('td', null, cargo.id),
            React.createElement('td', null, React.createElement('input', {
                className: 'form-control',
                value: cargo.name,
                onChange: (e) => handleInputChange(cargo.id, 'name', e.target.value)
            })),
            React.createElement('td', null,
                React.createElement('span', { className: `badge badge-${typeClassMap[cargo.type] || 'secondary'}` }, cargo.type)
            ),
            React.createElement('td', null, React.createElement('input', {
                className: 'form-control',
                value: cargo.sender,
                onChange: (e) => handleInputChange(cargo.id, 'sender', e.target.value)
            })),
            React.createElement('td', null, React.createElement('input', {
                className: 'form-control',
                value: cargo.receiver,
                onChange: (e) => handleInputChange(cargo.id, 'receiver', e.target.value)
            })),
            React.createElement('td', null, React.createElement('select', {
                className: 'form-control',
                value: cargo.routeId || '',
                onChange: (e) => handleInputChange(cargo.id, 'routeId', e.target.value ? parseInt(e.target.value) : null)
            }, [React.createElement('option', { value: '' }, 'Без маршрута'), ...routes.map(route => React.createElement('option', { value: route.id }, `Маршрут ${route.id} (${route.status})`))])),
            React.createElement('td', null, React.createElement('input', {
                type: 'number',
                className: 'form-control',
                value: cargo.handlingCost || '',
                onChange: (e) => handleInputChange(cargo.id, 'handlingCost', e.target.value)
            })),
            React.createElement('td', null,
                React.createElement('button', { className: 'btn btn-primary btn-sm', onClick: () => updateCargo(cargo.id) }, 'Обновить'),
                React.createElement('button', { className: 'btn btn-danger btn-sm', onClick: () => confirmDelete(cargo.id) }, 'Удалить')
            )
        );
    };

    return React.createElement('div', { className: 'table-container' },
        React.createElement('h3', null, 'Управление Грузами'),
        React.createElement('input', {
            type: 'text',
            className: 'form-control mb-3',
            placeholder: 'Поиск по грузам',
            value: searchQuery,
            onChange: handleSearch
        }),
        React.createElement('table', { className: 'table table-striped' },
            React.createElement('thead', null,
                React.createElement('tr', null,
                    ['ID', 'Название', 'Тип', 'Отправитель', 'Получатель', 'Маршрут', 'Затраты на обработку', 'Действия'].map(header => React.createElement('th', null, header))
                )
            ),
            React.createElement('tbody', null, cargoData.map(cargo => renderRow(cargo)))
        ),
        React.createElement('button', { className: 'btn btn-success', onClick: addCargo }, 'Добавить Груз'),
        React.createElement(ConfirmDeleteModal, { onConfirm: handleConfirmDelete, itemId: itemToDelete })
    );
};

// Компонент StaffTable
const StaffTable = () => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [staffData, setStaffData] = React.useState([]);
    const [itemToDelete, setItemToDelete] = React.useState(null);

    const fetchData = async () => {
        const response = await fetch(`/staff?search=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        setStaffData(data);
    };

    React.useEffect(() => {
        fetchData();
    }, [searchQuery]);

    const handleSearch = (e) => setSearchQuery(e.target.value);

    const handleInputChange = (id, field, value) => {
        setStaffData(prev => prev.map(item => item.id === id ? { ...item, [field]: field === 'salary' ? parseFloat(value) || 0 : value } : item));
    };

    const updateStaff = async (id) => {
        const staff = staffData.find(item => item.id === id);
        await fetch(`/staff/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(staff)
        });
        fetchData();
    };

    const deleteStaff = async (id) => {
        await fetch(`/staff/${id}`, { method: 'DELETE' });
        fetchData();
    };

    const confirmDelete = (id) => {
        setItemToDelete(id);
        $('#confirmDeleteModal').modal('show');
    };

    const handleConfirmDelete = () => {
        if (itemToDelete) {
            deleteStaff(itemToDelete);
            setItemToDelete(null);
        }
    };

    const addStaff = () => {
        setStaffData(prev => [...prev, { id: 'new', fullName: '', position: 'Диспетчер', hireDate: '', status: 'активный', salary: 0 }]);
    };

    const saveNewStaff = async (staff) => {
        await fetch('/staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(staff)
        });
        fetchData();
    };

    const renderRow = (staff) => {
        if (staff.id === 'new') {
            return React.createElement('tr', null,
                React.createElement('td', null, 'Авто'),
                React.createElement('td', null, React.createElement('input', {
                    className: 'form-control',
                    value: staff.fullName,
                    onChange: (e) => handleInputChange('new', 'fullName', e.target.value)
                })),
                React.createElement('td', null, React.createElement('select', {
                    className: 'form-control',
                    value: staff.position,
                    onChange: (e) => handleInputChange('new', 'position', e.target.value)
                }, ['Менеджер по логистике', 'Оператор', 'Водитель', 'Диспетчер', 'Администратор'].map(opt => React.createElement('option', { value: opt }, opt)))),
                React.createElement('td', null, React.createElement('input', {
                    type: 'date',
                    className: 'form-control',
                    value: staff.hireDate,
                    onChange: (e) => handleInputChange('new', 'hireDate', e.target.value)
                })),
                React.createElement('td', null, React.createElement('select', {
                    className: 'form-control',
                    value: staff.status,
                    onChange: (e) => handleInputChange('new', 'status', e.target.value)
                }, ['активный', 'в отпуске', 'уволен'].map(opt => React.createElement('option', { value: opt }, opt)))),
                React.createElement('td', null, React.createElement('input', {
                    type: 'number',
                    className: 'form-control',
                    value: staff.salary || '',
                    onChange: (e) => handleInputChange('new', 'salary', e.target.value)
                })),
                React.createElement('td', null,
                    React.createElement('button', { className: 'btn btn-success btn-sm', onClick: () => saveNewStaff(staff) }, 'Сохранить'),
                    React.createElement('button', { className: 'btn btn-secondary btn-sm', onClick: () => setStaffData(prev => prev.filter(item => item.id !== 'new')) }, 'Отмена')
                )
            );
        }
        return React.createElement('tr', null,
            React.createElement('td', null, staff.id),
            React.createElement('td', null, React.createElement('input', {
                className: 'form-control',
                value: staff.fullName,
                onChange: (e) => handleInputChange(staff.id, 'fullName', e.target.value)
            })),
            React.createElement('td', null, React.createElement('select', {
                className: 'form-control',
                value: staff.position,
                onChange: (e) => handleInputChange(staff.id, 'position', e.target.value)
            }, ['Менеджер по логистике', 'Оператор', 'Водитель', 'Диспетчер', 'Администратор'].map(opt => React.createElement('option', { value: opt }, opt)))),
            React.createElement('td', null, React.createElement('input', {
                type: 'date',
                className: 'form-control',
                value: staff.hireDate,
                onChange: (e) => handleInputChange(staff.id, 'hireDate', e.target.value)
            })),
            React.createElement('td', null,
                React.createElement('span', { className: `badge badge-${statusClassMap[staff.status] || 'info'}` }, staff.status)
            ),
            React.createElement('td', null, React.createElement('input', {
                type: 'number',
                className: 'form-control',
                value: staff.salary || '',
                onChange: (e) => handleInputChange(staff.id, 'salary', e.target.value)
            })),
            React.createElement('td', null,
                React.createElement('button', { className: 'btn btn-primary btn-sm', onClick: () => updateStaff(staff.id) }, 'Обновить'),
                React.createElement('button', { className: 'btn btn-danger btn-sm', onClick: () => confirmDelete(staff.id) }, 'Удалить')
            )
        );
    };

    return React.createElement('div', { className: 'table-container' },
        React.createElement('h3', null, 'Управление Персоналом'),
        React.createElement('input', {
            type: 'text',
            className: 'form-control mb-3',
            placeholder: 'Поиск по персоналу',
            value: searchQuery,
            onChange: handleSearch
        }),
        React.createElement('table', { className: 'table table-striped' },
            React.createElement('thead', null,
                React.createElement('tr', null,
                    ['ID', 'ФИО', 'Должность', 'Дата Приема', 'Статус', 'Зарплата', 'Действия'].map(header => React.createElement('th', null, header))
                )
            ),
            React.createElement('tbody', null, staffData.map(staff => renderRow(staff)))
        ),
        React.createElement('button', { className: 'btn btn-success', onClick: addStaff }, 'Добавить Сотрудника'),
        React.createElement(ConfirmDeleteModal, { onConfirm: handleConfirmDelete, itemId: itemToDelete })
    );
};

// Компонент TransportTable
const TransportTable = () => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [transportData, setTransportData] = React.useState([]);
    const [drivers, setDrivers] = React.useState([]);
    const [itemToDelete, setItemToDelete] = React.useState(null);

    const fetchData = async () => {
        const transportResponse = await fetch(`/transport?search=${encodeURIComponent(searchQuery)}`);
        const staffResponse = await fetch('/staff');
        const transportData = await transportResponse.json();
        const staffData = await staffResponse.json();
        setTransportData(transportData);
        setDrivers(staffData.filter(staff => staff.position === 'Водитель'));
    };

    React.useEffect(() => {
        fetchData();
    }, [searchQuery]);

    const handleSearch = (e) => setSearchQuery(e.target.value);

    const handleInputChange = (id, field, value) => {
        setTransportData(prev => prev.map(item => item.id === id ? { ...item, [field]: field === 'maintenanceCost' ? parseFloat(value) || 0 : value } : item));
    };

    const updateTransport = async (id) => {
        const transport = transportData.find(item => item.id === id);
        await fetch(`/transport/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transport)
        });
        fetchData();
    };

    const deleteTransport = async (id) => {
        await fetch(`/transport/${id}`, { method: 'DELETE' });
        fetchData();
    };

    const confirmDelete = (id) => {
        setItemToDelete(id);
        $('#confirmDeleteModal').modal('show');
    };

    const handleConfirmDelete = () => {
        if (itemToDelete) {
            deleteTransport(itemToDelete);
            setItemToDelete(null);
        }
    };

    const addTransport = () => {
        setTransportData(prev => [...prev, { id: 'new', type: 'грузовик', model: '', licensePlate: '', status: 'свободен', driver: null, maintenanceCost: 0 }]);
    };

    const saveNewTransport = async (transport) => {
        await fetch('/transport', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transport)
        });
        fetchData();
    };

    const renderRow = (transport) => {
        if (transport.id === 'new') {
            return React.createElement('tr', null,
                React.createElement('td', null, 'Авто'),
                React.createElement('td', null, React.createElement('select', {
                    className: 'form-control',
                    value: transport.type,
                    onChange: (e) => handleInputChange('new', 'type', e.target.value)
                }, ['грузовик', 'поезд', 'самолет'].map(opt => React.createElement('option', { value: opt }, opt)))),
                React.createElement('td', null, React.createElement('input', {
                    className: 'form-control',
                    value: transport.model,
                    onChange: (e) => handleInputChange('new', 'model', e.target.value)
                })),
                React.createElement('td', null, React.createElement('input', {
                    className: 'form-control',
                    value: transport.licensePlate,
                    onChange: (e) => handleInputChange('new', 'licensePlate', e.target.value)
                })),
                React.createElement('td', null, React.createElement('select', {
                    className: 'form-control',
                    value: transport.status,
                    onChange: (e) => handleInputChange('new', 'status', e.target.value)
                }, ['в работе', 'на ремонте', 'свободен'].map(opt => React.createElement('option', { value: opt }, opt)))),
                React.createElement('td', null, React.createElement('select', {
                    className: 'form-control',
                    value: transport.driver || '',
                    onChange: (e) => handleInputChange('new', 'driver', e.target.value || null)
                }, [React.createElement('option', { value: '' }, 'Без водителя'), ...drivers.map(driver => React.createElement('option', { value: driver.fullName }, driver.fullName))])),
                React.createElement('td', null, React.createElement('input', {
                    type: 'number',
                    className: 'form-control',
                    value: transport.maintenanceCost || '',
                    onChange: (e) => handleInputChange('new', 'maintenanceCost', e.target.value)
                })),
                React.createElement('td', null,
                    React.createElement('button', { className: 'btn btn-success btn-sm', onClick: () => saveNewTransport(transport) }, 'Сохранить'),
                    React.createElement('button', { className: 'btn btn-secondary btn-sm', onClick: () => setTransportData(prev => prev.filter(item => item.id !== 'new')) }, 'Отмена')
                )
            );
        }
        return React.createElement('tr', null,
            React.createElement('td', null, transport.id),
            React.createElement('td', null, React.createElement('select', {
                className: 'form-control',
                value: transport.type,
                onChange: (e) => handleInputChange(transport.id, 'type', e.target.value)
            }, ['грузовик', 'поезд', 'самолет'].map(opt => React.createElement('option', { value: opt }, opt)))),
            React.createElement('td', null, React.createElement('input', {
                className: 'form-control',
                value: transport.model,
                onChange: (e) => handleInputChange(transport.id, 'model', e.target.value)
            })),
            React.createElement('td', null, React.createElement('input', {
                className: 'form-control',
                value: transport.licensePlate,
                onChange: (e) => handleInputChange(transport.id, 'licensePlate', e.target.value)
            })),
            React.createElement('td', null,
                React.createElement('span', { className: `badge badge-${statusClassMap[transport.status] || 'info'}` }, transport.status)
            ),
            React.createElement('td', null, React.createElement('select', {
                className: 'form-control',
                value: transport.driver || '',
                onChange: (e) => handleInputChange(transport.id, 'driver', e.target.value || null)
            }, [React.createElement('option', { value: '' }, 'Без водителя'), ...drivers.map(driver => React.createElement('option', { value: driver.fullName }, driver.fullName))])),
            React.createElement('td', null, React.createElement('input', {
                type: 'number',
                className: 'form-control',
                value: transport.maintenanceCost || '',
                onChange: (e) => handleInputChange(transport.id, 'maintenanceCost', e.target.value)
            })),
            React.createElement('td', null,
                React.createElement('button', { className: 'btn btn-primary btn-sm', onClick: () => updateTransport(transport.id) }, 'Обновить'),
                React.createElement('button', { className: 'btn btn-danger btn-sm', onClick: () => confirmDelete(transport.id) }, 'Удалить')
            )
        );
    };

    return React.createElement('div', { className: 'table-container' },
        React.createElement('h3', null, 'Управление Транспортом'),
        React.createElement('input', {
            type: 'text',
            className: 'form-control mb-3',
            placeholder: 'Поиск по транспорту',
            value: searchQuery,
            onChange: handleSearch
        }),
        React.createElement('table', { className: 'table table-striped' },
            React.createElement('thead', null,
                React.createElement('tr', null,
                    ['ID', 'Тип', 'Модель', 'Гос. Номер', 'Статус', 'Водитель', 'Затраты на обслуживание', 'Действия'].map(header => React.createElement('th', null, header))
                )
            ),
            React.createElement('tbody', null, transportData.map(transport => renderRow(transport)))
        ),
        React.createElement('button', { className: 'btn btn-success', onClick: addTransport }, 'Добавить Транспорт'),
        React.createElement(ConfirmDeleteModal, { onConfirm: handleConfirmDelete, itemId: itemToDelete })
    );
};

// Компонент ReportsTable
const ReportsTable = () => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [reportsData, setReportsData] = React.useState([]);
    const [managers, setManagers] = React.useState([]);
    const [reportContent, setReportContent] = React.useState('');
    const [itemToDelete, setItemToDelete] = React.useState(null);

    const fetchData = async () => {
        const reportsResponse = await fetch(`/reports?search=${encodeURIComponent(searchQuery)}`);
        const staffResponse = await fetch('/staff');
        const reportsData = await reportsResponse.json();
        const staffData = await staffResponse.json();
        setReportsData(reportsData);
        setManagers(staffData.filter(staff => staff.position === 'Менеджер по логистике'));
    };

    React.useEffect(() => {
        fetchData();
    }, [searchQuery]);

    const handleSearch = (e) => setSearchQuery(e.target.value);

    const handleInputChange = (id, field, value) => {
        setReportsData(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const updateReport = async (id) => {
        const report = reportsData.find(item => item.id === id);
        await fetch(`/reports/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report)
        });
        fetchData();
    };

    const deleteReport = async (id) => {
        await fetch(`/reports/${id}`, { method: 'DELETE' });
        fetchData();
    };

    const confirmDelete = (id) => {
        setItemToDelete(id);
        $('#confirmDeleteModal').modal('show');
    };

    const handleConfirmDelete = () => {
        if (itemToDelete) {
            deleteReport(itemToDelete);
            setItemToDelete(null);
        }
    };

    const addReport = () => {
        setReportsData(prev => [...prev, { id: 'new', type: 'ежедневный', creationDate: '', reportPeriod: '1 Месяц', author: null, status: 'в разработке' }]);
    };

    const saveNewReport = async (report) => {
        await fetch('/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report)
        });
        fetchData();
    };

    const generateReport = async () => {
        const response = await fetch('/generate-report');
        const report = await response.json();
        setReportContent(`
            <h4>Финансовый отчет</h4>
            <p>Общая зарплата сотрудников: ${report.totalSalary.toFixed(2)} руб.</p>
            <p>Общие затраты на транспорт: ${report.totalMaintenance.toFixed(2)} руб.</p>
            <p>Общие затраты на грузы: ${report.totalHandling.toFixed(2)} руб.</p>
            <p>Общий доход от маршрутов: ${report.totalRevenue.toFixed(2)} руб.</p>
            <p>Общие затраты: ${report.totalExpenses.toFixed(2)} руб.</p>
            <p>Прибыль: ${report.profit.toFixed(2)} руб.</p>
            <h4>Статистика по сотрудникам</h4>
            <ul>${report.staffStats.map(stat => `<li>${stat.position}: ${stat.count} чел., средняя зарплата ${stat.avgSalary.toFixed(2)} руб.</li>`).join('')}</ul>
            <h4>Статистика по транспорту</h4>
            <ul>${report.transportStats.map(stat => `<li>${stat.type}: ${stat.count} ед., средние затраты ${stat.avgCost.toFixed(2)} руб.</li>`).join('')}</ul>
            <h4>Статистика по грузам</h4>
            <ul>${report.cargoStats.map(stat => `<li>${stat.type}: ${stat.count} ед., средние затраты ${stat.avgCost.toFixed(2)} руб.</li>`).join('')}</ul>
            <h4>Статистика по маршрутам</h4>
            <ul>${report.routesStats.map(stat => `<li>${stat.status}: ${stat.count} шт., средний доход ${stat.avgRevenue.toFixed(2)} руб.</li>`).join('')}</ul>
        `);
    };

    const exportReport = () => window.location.href = '/export-report';

    const renderRow = (report) => {
        if (report.id === 'new') {
            return React.createElement('tr', null,
                React.createElement('td', null, 'Авто'),
                React.createElement('td', null, React.createElement('select', {
                    className: 'form-control',
                    value: report.type,
                    onChange: (e) => handleInputChange('new', 'type', e.target.value)
                }, ['ежедневный', 'ежемесячный', 'по грузам', 'по персоналу'].map(opt => React.createElement('option', { value: opt }, opt)))),
                React.createElement('td', null, React.createElement('input', {
                    type: 'date',
                    className: 'form-control',
                    value: report.creationDate,
                    onChange: (e) => handleInputChange('new', 'creationDate', e.target.value)
                })),
                React.createElement('td', null, React.createElement('select', {
                    className: 'form-control',
                    value: report.reportPeriod,
                    onChange: (e) => handleInputChange('new', 'reportPeriod', e.target.value)
                }, ['1 Месяц', '3 Месяца', '6 Месяцев', '12 Месяцев'].map(opt => React.createElement('option', { value: opt }, opt)))),
                React.createElement('td', null, React.createElement('select', {
                    className: 'form-control',
                    value: report.author || '',
                    onChange: (e) => handleInputChange('new', 'author', e.target.value || null)
                }, [React.createElement('option', { value: '' }, 'Без автора'), ...managers.map(manager => React.createElement('option', { value: manager.fullName }, manager.fullName))])),
                React.createElement('td', null, React.createElement('select', {
                    className: 'form-control',
                    value: report.status,
                    onChange: (e) => handleInputChange('new', 'status', e.target.value)
                }, ['в разработке', 'завершен', 'утвержден'].map(opt => React.createElement('option', { value: opt }, opt)))),
                React.createElement('td', null,
                    React.createElement('button', { className: 'btn btn-success btn-sm', onClick: () => saveNewReport(report) }, 'Сохранить'),
                    React.createElement('button', { className: 'btn btn-secondary btn-sm', onClick: () => setReportsData(prev => prev.filter(item => item.id !== 'new')) }, 'Отмена')
                )
            );
        }
        return React.createElement('tr', null,
            React.createElement('td', null, report.id),
            React.createElement('td', null, React.createElement('select', {
                className: 'form-control',
                value: report.type,
                onChange: (e) => handleInputChange(report.id, 'type', e.target.value)
            }, ['ежедневный', 'ежемесячный', 'по грузам', 'по персоналу'].map(opt => React.createElement('option', { value: opt }, opt)))),
            React.createElement('td', null, React.createElement('input', {
                type: 'date',
                className: 'form-control',
                value: report.creationDate,
                onChange: (e) => handleInputChange(report.id, 'creationDate', e.target.value)
            })),
            React.createElement('td', null, React.createElement('select', {
                className: 'form-control',
                value: report.reportPeriod,
                onChange: (e) => handleInputChange(report.id, 'reportPeriod', e.target.value)
            }, ['1 Месяц', '3 Месяца', '6 Месяцев', '12 Месяцев'].map(opt => React.createElement('option', { value: opt }, opt)))),
            React.createElement('td', null, React.createElement('select', {
                className: 'form-control',
                value: report.author || '',
                onChange: (e) => handleInputChange(report.id, 'author', e.target.value || null)
            }, [React.createElement('option', { value: '' }, 'Без автора'), ...managers.map(manager => React.createElement('option', { value: manager.fullName }, manager.fullName))])),
            React.createElement('td', null,
                React.createElement('span', { className: `badge badge-${statusClassMap[report.status] || 'info'}` }, report.status)
            ),
            React.createElement('td', null,
                React.createElement('button', { className: 'btn btn-primary btn-sm', onClick: () => updateReport(report.id) }, 'Обновить'),
                React.createElement('button', { className: 'btn btn-danger btn-sm', onClick: () => confirmDelete(report.id) }, 'Удалить')
            )
        );
    };

    return React.createElement('div', { className: 'table-container' },
        React.createElement('h3', null, 'Управление Отчётами'),
        React.createElement('input', {
            type: 'text',
            className: 'form-control mb-3',
            placeholder: 'Поиск по отчётам',
            value: searchQuery,
            onChange: handleSearch
        }),
        React.createElement('table', { className: 'table table-striped' },
            React.createElement('thead', null,
                React.createElement('tr', null,
                    ['ID', 'Тип', 'Дата Создания', 'Период', 'Автор', 'Статус', 'Действия'].map(header => React.createElement('th', null, header))
                )
            ),
            React.createElement('tbody', null, reportsData.map(report => renderRow(report)))
        ),
        React.createElement('button', { className: 'btn btn-success mr-2', onClick: addReport }, 'Добавить Отчет'),
        React.createElement('button', { className: 'btn btn-primary mr-2', onClick: generateReport }, 'Сгенерировать отчет'),
        React.createElement('button', { className: 'btn btn-info', onClick: exportReport }, 'Экспортировать в Excel'),
        React.createElement('div', { id: 'reportContent', dangerouslySetInnerHTML: { __html: reportContent } }),
        React.createElement(ConfirmDeleteModal, { onConfirm: handleConfirmDelete, itemId: itemToDelete })
    );
};

// Компонент RoutesTable
const RoutesTable = () => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [routesData, setRoutesData] = React.useState([]);
    const [transport, setTransport] = React.useState([]);
    const [itemToDelete, setItemToDelete] = React.useState(null);

    const fetchData = async () => {
        const routesResponse = await fetch(`/routes?search=${encodeURIComponent(searchQuery)}`);
        const transportResponse = await fetch('/transport');
        const routesData = await routesResponse.json();
        const transportData = await transportResponse.json();
        setRoutesData(routesData);
        setTransport(transportData);
    };

    React.useEffect(() => {
        fetchData();
    }, [searchQuery]);

    const handleSearch = (e) => setSearchQuery(e.target.value);

    const handleInputChange = (id, field, value) => {
        setRoutesData(prev => prev.map(item => item.id === id ? { ...item, [field]: field === 'revenue' ? parseFloat(value) || 0 : value } : item));
    };

    const updateRoute = async (id) => {
        const route = routesData.find(item => item.id === id);
        await fetch(`/routes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(route)
        });
        fetchData();
    };

    const deleteRoute = async (id) => {
        await fetch(`/routes/${id}`, { method: 'DELETE' });
        fetchData();
    };

    const confirmDelete = (id) => {
        setItemToDelete(id);
        $('#confirmDeleteModal').modal('show');
    };

    const handleConfirmDelete = () => {
        if (itemToDelete) {
            deleteRoute(itemToDelete);
            setItemToDelete(null);
        }
    };

    const addRoute = () => {
        setRoutesData(prev => [...prev, { id: 'new', transportId: transport[0]?.id || '', startPoint: '', endPoint: '', estimatedTime: '', actualTime: null, status: 'в пути', revenue: 0 }]);
    };

    const saveNewRoute = async (route) => {
        await fetch('/routes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(route)
        });
        fetchData();
    };

    const renderRow = (route) => {
        if (route.id === 'new') {
            return React.createElement('tr', null,
                React.createElement('td', null, 'Авто'),
                React.createElement('td', null, React.createElement('select', {
                    className: 'form-control',
                    value: route.transportId,
                    onChange: (e) => handleInputChange('new', 'transportId', parseInt(e.target.value))
                }, transport.map(t => React.createElement('option', { value: t.id }, t.model)))),
                React.createElement('td', null, React.createElement('input', {
                    className: 'form-control',
                    value: route.startPoint,
                    onChange: (e) => handleInputChange('new', 'startPoint', e.target.value)
                })),
                React.createElement('td', null, React.createElement('input', {
                    className: 'form-control',
                    value: route.endPoint,
                    onChange: (e) => handleInputChange('new', 'endPoint', e.target.value)
                })),
                React.createElement('td', null, React.createElement('input', {
                    type: 'datetime-local',
                    className: 'form-control',
                    value: route.estimatedTime,
                    onChange: (e) => handleInputChange('new', 'estimatedTime', e.target.value)
                })),
                React.createElement('td', null, React.createElement('input', {
                    type: 'datetime-local',
                    className: 'form-control',
                    value: route.actualTime || '',
                    onChange: (e) => handleInputChange('new', 'actualTime', e.target.value || null)
                })),
                React.createElement('td', null, React.createElement('select', {
                    className: 'form-control',
                    value: route.status,
                    onChange: (e) => handleInputChange('new', 'status', e.target.value)
                }, ['в пути', 'доставлен', 'отменен'].map(opt => React.createElement('option', { value: opt }, opt)))),
                React.createElement('td', null, React.createElement('input', {
                    type: 'number',
                    className: 'form-control',
                    value: route.revenue || '',
                    onChange: (e) => handleInputChange('new', 'revenue', e.target.value)
                })),
                React.createElement('td', null,
                    React.createElement('button', { className: 'btn btn-success btn-sm', onClick: () => saveNewRoute(route) }, 'Сохранить'),
                    React.createElement('button', { className: 'btn btn-secondary btn-sm', onClick: () => setRoutesData(prev => prev.filter(item => item.id !== 'new')) }, 'Отмена')
                )
            );
        }
        return React.createElement('tr', null,
            React.createElement('td', null, route.id),
            React.createElement('td', null, React.createElement('select', {
                className: 'form-control',
                value: route.transportId,
                onChange: (e) => handleInputChange(route.id, 'transportId', parseInt(e.target.value))
            }, transport.map(t => React.createElement('option', { value: t.id }, t.model)))),
            React.createElement('td', null, React.createElement('input', {
                className: 'form-control',
                value: route.startPoint,
                onChange: (e) => handleInputChange(route.id, 'startPoint', e.target.value)
            })),
            React.createElement('td', null, React.createElement('input', {
                className: 'form-control',
                value: route.endPoint,
                onChange: (e) => handleInputChange(route.id, 'endPoint', e.target.value)
            })),
            React.createElement('td', null, React.createElement('input', {
                type: 'datetime-local',
                className: 'form-control',
                value: route.estimatedTime,
                onChange: (e) => handleInputChange(route.id, 'estimatedTime', e.target.value)
            })),
            React.createElement('td', null, React.createElement('input', {
                type: 'datetime-local',
                className: 'form-control',
                value: route.actualTime || '',
                onChange: (e) => handleInputChange(route.id, 'actualTime', e.target.value || null)
            })),
            React.createElement('td', null,
                React.createElement('span', { className: `badge badge-${statusClassMap[route.status] || 'info'}` }, route.status)
            ),
            React.createElement('td', null, React.createElement('input', {
                type: 'number',
                className: 'form-control',
                value: route.revenue || '',
                onChange: (e) => handleInputChange(route.id, 'revenue', e.target.value)
            })),
            React.createElement('td', null,
                React.createElement('button', { className: 'btn btn-primary btn-sm', onClick: () => updateRoute(route.id) }, 'Обновить'),
                React.createElement('button', { className: 'btn btn-danger btn-sm', onClick: () => confirmDelete(route.id) }, 'Удалить')
            )
        );
    };

    return React.createElement('div', { className: 'table-container' },
        React.createElement('h3', null, 'Управление Маршрутами'),
        React.createElement('input', {
            type: 'text',
            className: 'form-control mb-3',
            placeholder: 'Поиск по маршрутам',
            value: searchQuery,
            onChange: handleSearch
        }),
        React.createElement('table', { className: 'table table-striped' },
            React.createElement('thead', null,
                React.createElement('tr', null,
                    ['ID', 'Транспорт', 'Начало', 'Конец', 'Предп. Время', 'Факт. Время', 'Статус', 'Доход', 'Действия'].map(header => React.createElement('th', null, header))
                )
            ),
            React.createElement('tbody', null, routesData.map(route => renderRow(route)))
        ),
        React.createElement('button', { className: 'btn btn-success', onClick: addRoute }, 'Добавить Маршрут'),
        React.createElement(ConfirmDeleteModal, { onConfirm: handleConfirmDelete, itemId: itemToDelete })
    );
};

// Функции управления формами и аутентификацией (без изменений)
function toggleForm() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const dashboard = document.getElementById('dashboard');

    if (loginForm.style.display === 'none' && registerForm.style.display === 'none') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        dashboard.style.display = 'none';
    } else if (loginForm.style.display === 'block') {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    } else {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    }
}

document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (data.message === 'Вход выполнен успешно!') {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        document.getElementById('currentUser').textContent = username;
        document.getElementById('error-message').textContent = '';
    } else {
        document.getElementById('error-message').textContent = data.message;
    }
});

document.getElementById('registerForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newPassword').value;
    const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    document.getElementById('register-message').textContent = data.message;
    if (data.message === 'Регистрация успешна!') toggleForm();
});

function logout() {
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('error-message').textContent = '';
    document.getElementById('contentArea').innerHTML = '';
}

function loadSection(section) {
    const modalContentArea = document.getElementById('modalContentArea');
    let tableComponent;

    if (section === 'cargo') {
        tableComponent = React.createElement(CargoTable);
    } else if (section === 'staff') {
        tableComponent = React.createElement(StaffTable);
    } else if (section === 'transport') {
        tableComponent = React.createElement(TransportTable);
    } else if (section === 'reports') {
        tableComponent = React.createElement(ReportsTable);
    } else if (section === 'routes') {
        tableComponent = React.createElement(RoutesTable);
    }

    ReactDOM.render(tableComponent, modalContentArea);
    $('#tableModal').modal('show');
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

window.addEventListener('load', () => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') document.body.classList.add('dark-theme');
});
