// ФАЙЛ SCRIPT.JS:
/**
 * A map of cargo types to their corresponding CSS classes for styling.
 * @type {Object.<string, string>}
 */
const typeClassMap = {
    'обычный': 'secondary',
    'опасный': 'danger',
    'скоропортящийся': 'warning'
};

/**
 * A map of various statuses to their corresponding CSS classes for styling.
 * @type {Object.<string, string>}
 */
const statusClassMap = {
    'активный': 'success',
    'в отпуске': 'warning',
    'уволен': 'danger',
    'в работе': 'primary',
    'на ремонте': 'warning',
    'свободен': 'success',
    'в разработке': 'info',
    'завершен': 'success',
    'утвержден': 'primary',
    'в пути': 'primary',
    'доставлен': 'success',
    'отменен': 'danger'
};

/**
 * A React component that displays a confirmation modal for deleting an item.
 * This component does not render any visible elements itself but manages the behavior of a Bootstrap modal.
 * @param {object} props - The component props.
 * @param {function(number): void} props.onConfirm - The function to call when the delete operation is confirmed. It receives the item ID.
 * @param {number | null} props.itemId - The ID of the item to be deleted. The modal is shown when this is not null.
 * @returns {null} This component does not render anything.
 */
const ConfirmDeleteModal = ({ onConfirm, itemId }) => {
    /**
     * Handles the click on the confirm button in the modal.
     */
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
    }, [itemId, onConfirm]);

    return null;
};

/**
 * A React component for managing users in a table.
 * It allows searching, adding, updating, and deleting users.
 * @state {string} searchQuery - The current text in the search input.
 * @state {Array<object>} usersData - An array of user objects to display.
 * @state {number | null} itemToDelete - The ID of the user marked for deletion.
 * @returns {React.ReactElement} The UsersTable component.
 */
const UsersTable = () => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [usersData, setUsersData] = React.useState([]);
    const [itemToDelete, setItemToDelete] = React.useState(null);

    const fetchData = async () => {
        const response = await fetch(`/users?search=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        setUsersData(data);
    };

    React.useEffect(() => {
        fetchData();
    }, [searchQuery]);

    const handleSearch = (e) => setSearchQuery(e.target.value);

    const handleInputChange = (id, field, value) => {
        setUsersData(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const updateUser = async (id) => {
        const user = usersData.find(item => item.id === id);
        const updateData = {
            username: user.username,
            role: user.role,
            currentUserRole: currentUserRole
        };
        if (user.password) updateData.password = user.password;
        const response = await fetch(`/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        const result = await response.json();
        if (response.ok) {
            fetchData();
        } else {
            alert(result.message);
        }
    };

    const deleteUser = async (id) => {
        const response = await fetch(`/users/${id}?currentUserRole=${encodeURIComponent(currentUserRole)}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (response.ok) {
            fetchData();
        } else {
            alert(result.message);
        }
    };

    const confirmDelete = (id) => {
        setItemToDelete(id);
        $('#confirmDeleteModal').modal('show');
    };

    /**
     * Handles the confirmation of a delete operation from the modal.
     * It calls the deleteUser function with the stored item ID.
     */
    const handleConfirmDelete = () => {
        if (itemToDelete) {
            deleteUser(itemToDelete);
            setItemToDelete(null);
        }
    };

    const addUser = () => {
        setUsersData(prev => [...prev, { id: 'new', username: '', password: '', role: 'Диспетчер' }]);
    };

    const saveNewUser = async (user) => {
        await fetch('/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
        fetchData();
    };

    /**
     * Renders a single row in the users table.
     * @param {object} user - The user object to render.
     * @returns {React.ReactElement} A table row element.
     */
    const renderRow = (user) => {
        if (user.id === 'new') {
            return React.createElement('tr', { key: 'new' },
                React.createElement('td', null, 'Авто'),
                React.createElement('td', null, React.createElement('input', {
                    className: 'form-control',
                    value: user.username,
                    onChange: (e) => handleInputChange('new', 'username', e.target.value)
                })),
                React.createElement('td', null, React.createElement('input', {
                    type: 'password',
                    className: 'form-control',
                    value: user.password,
                    onChange: (e) => handleInputChange('new', 'password', e.target.value)
                })),
                React.createElement('td', null, React.createElement('select', {
                    className: 'form-control',
                    value: user.role,
                    onChange: (e) => handleInputChange('new', 'role', e.target.value)
                },
                    ['Администратор', 'Менеджер', 'Диспетчер'].map(opt => React.createElement('option', { key: opt, value: opt }, opt))
                )),
                React.createElement('td', null,
                    React.createElement('button', { className: 'btn btn-success btn-sm', onClick: () => saveNewUser(user) }, 'Сохранить'),
                    React.createElement('button', { className: 'btn btn-secondary btn-sm', onClick: () => setUsersData(prev => prev.filter(item => item.id !== 'new')) }, 'Отмена')
                )
            );
        }
        return React.createElement('tr', { key: user.id },
            React.createElement('td', null, user.id),
            React.createElement('td', null, React.createElement('input', {
                className: 'form-control',
                value: user.username,
                onChange: (e) => handleInputChange(user.id, 'username', e.target.value)
            })),
            React.createElement('td', null, React.createElement('input', {
                type: 'password',
                className: 'form-control',
                placeholder: 'Новый пароль (оставьте пустым, чтобы не менять)',
                onChange: (e) => handleInputChange(user.id, 'password', e.target.value)
            })),
            React.createElement('td', null, React.createElement('select', {
                className: 'form-control',
                value: user.role,
                onChange: (e) => handleInputChange(user.id, 'role', e.target.value)
            },
                ['Администратор', 'Менеджер', 'Диспетчер'].map(opt => React.createElement('option', { key: opt, value: opt }, opt))
            )),
            React.createElement('td', null,
                React.createElement('button', { className: 'btn btn-primary btn-sm', onClick: () => updateUser(user.id) }, 'Обновить'),
                React.createElement('button', { className: 'btn btn-danger btn-sm', onClick: () => confirmDelete(user.id) }, 'Удалить')
            )
        );
    };

    return React.createElement('div', { className: 'table-container' },
        React.createElement('h3', null, 'Управление Пользователями'),
        React.createElement('input', {
            type: 'text',
            className: 'form-control mb-3',
            placeholder: 'Поиск по пользователям',
            value: searchQuery,
            onChange: handleSearch
        }),
        React.createElement('table', { className: 'table table-striped' },
            React.createElement('thead', null,
                React.createElement('tr', null,
                    ['ID', 'Логин', 'Пароль', 'Роль', 'Действия'].map(header => React.createElement('th', { key: header }, header))
                )
            ),
            React.createElement('tbody', null, usersData.map(user => renderRow(user)))
        ),
        React.createElement('button', { className: 'btn btn-success', onClick: addUser }, 'Добавить Пользователя'),
        React.createElement(ConfirmDeleteModal, { onConfirm: handleConfirmDelete, itemId: itemToDelete })
    );
};

/**
 * A React component for managing cargo in a table.
 * @state {string} searchQuery - The current text in the search input.
 * @state {Array<object>} cargoData - An array of cargo objects to display.
 * @state {Array<object>} routes - An array of available routes for selection.
 * @state {number | null} itemToDelete - The ID of the cargo item marked for deletion.
 * @returns {React.ReactElement} The CargoTable component.
 */
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

    /**
     * Handles the confirmation of a delete operation from the modal.
     * It calls the deleteCargo function with the stored item ID.
     */
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

    /**
     * Renders a single row in the cargo table.
     * @param {object} cargo - The cargo object to render.
     * @returns {React.ReactElement} A table row element.
     */
    const renderRow = (cargo) => {
        if (cargo.id === 'new') {
            return React.createElement('tr', { key: 'new' },
                React.createElement('td', null, 'Авто'),
                React.createElement('td', null, React.createElement('input', {
                    className: 'form-control',
                    value: cargo.name,
                    onChange: (e) => handleInputChange('new', 'name', e.target.value)
                })),
                React.createElement('td', null, React.createElement('select', {
                    className: `form-control badge badge-${typeClassMap[cargo.type] || 'secondary'}`,
                    value: cargo.type,
                    onChange: (e) => handleInputChange('new', 'type', e.target.value)
                }, ['обычный', 'опасный', 'скоропортящийся'].map(opt => React.createElement('option', { key: opt, value: opt }, opt)))),
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
                }, [React.createElement('option', { key: '', value: '' }, 'Без маршрута'), ...routes.map(route => React.createElement('option', { key: route.id, value: route.id }, `Маршрут ${route.id} (${route.status})`))])),
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
        return React.createElement('tr', { key: cargo.id },
            React.createElement('td', null, cargo.id),
            React.createElement('td', null, React.createElement('input', {
                className: 'form-control',
                value: cargo.name,
                onChange: (e) => handleInputChange(cargo.id, 'name', e.target.value)
            })),
            React.createElement('td', null, React.createElement('select', {
                className: `form-control badge badge-${typeClassMap[cargo.type] || 'secondary'}`,
                value: cargo.type,
                onChange: (e) => handleInputChange(cargo.id, 'type', e.target.value)
            }, ['обычный', 'опасный', 'скоропортящийся'].map(opt => React.createElement('option', { key: opt, value: opt }, opt)))),
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
            }, [React.createElement('option', { key: '', value: '' }, 'Без маршрута'), ...routes.map(route => React.createElement('option', { key: route.id, value: route.id }, `Маршрут ${route.id} (${route.status})`))])),
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
                    ['ID', 'Название', 'Тип', 'Отправитель', 'Получатель', 'Маршрут', 'Затраты на обработку', 'Действия'].map(header => React.createElement('th', { key: header }, header))
                )
            ),
            React.createElement('tbody', null, cargoData.map(cargo => renderRow(cargo)))
        ),
        React.createElement('button', { className: 'btn btn-success', onClick: addCargo }, 'Добавить Груз'),
        React.createElement(ConfirmDeleteModal, { onConfirm: handleConfirmDelete, itemId: itemToDelete })
    );
};

/**
 * A React component for managing staff in a table.
 * @state {string} searchQuery - The current text in the search input.
 * @state {Array<object>} staffData - An array of staff objects to display.
 * @state {number | null} itemToDelete - The ID of the staff member marked for deletion.
 * @returns {React.ReactElement} The StaffTable component.
 */
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

    /**
     * Handles the confirmation of a delete operation from the modal.
     * It calls the deleteStaff function with the stored item ID.
     */
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

    /**
     * Renders a single row in the staff table.
     * @param {object} staff - The staff object to render.
     * @returns {React.ReactElement} A table row element.
     */
    const renderRow = (staff) => {
        if (staff.id === 'new') {
            return React.createElement('tr', { key: 'new' },
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
                }, ['Менеджер по логистике', 'Оператор', 'Водитель', 'Диспетчер', 'Администратор'].map(opt => React.createElement('option', { key: opt, value: opt }, opt)))),
                React.createElement('td', null, React.createElement('input', {
                    type: 'date',
                    className: 'form-control',
                    value: staff.hireDate,
                    onChange: (e) => handleInputChange('new', 'hireDate', e.target.value)
                })),
                React.createElement('td', null, React.createElement('select', {
                    className: `form-control badge badge-${statusClassMap[staff.status] || 'info'}`,
                    value: staff.status,
                    onChange: (e) => handleInputChange('new', 'status', e.target.value)
                }, ['активный', 'в отпуске', 'уволен'].map(opt => React.createElement('option', { key: opt, value: opt }, opt)))),
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
        return React.createElement('tr', { key: staff.id },
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
            }, ['Менеджер по логистике', 'Оператор', 'Водитель', 'Диспетчер', 'Администратор'].map(opt => React.createElement('option', { key: opt, value: opt }, opt)))),
            React.createElement('td', null, React.createElement('input', {
                type: 'date',
                className: 'form-control',
                value: staff.hireDate,
                onChange: (e) => handleInputChange(staff.id, 'hireDate', e.target.value)
            })),
            React.createElement('td', null, React.createElement('select', {
                className: `form-control badge badge-${statusClassMap[staff.status] || 'info'}`,
                value: staff.status,
                onChange: (e) => handleInputChange(staff.id, 'status', e.target.value)
            }, ['активный', 'в отпуске', 'уволен'].map(opt => React.createElement('option', { key: opt, value: opt }, opt)))),
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
                    ['ID', 'ФИО', 'Должность', 'Дата Приема', 'Статус', 'Зарплата', 'Действия'].map(header => React.createElement('th', { key: header }, header))
                )
            ),
            React.createElement('tbody', null, staffData.map(staff => renderRow(staff)))
        ),
        React.createElement('button', { className: 'btn btn-success', onClick: addStaff }, 'Добавить Сотрудника'),
        React.createElement(ConfirmDeleteModal, { onConfirm: handleConfirmDelete, itemId: itemToDelete })
    );
};

/**
 * A React component for managing transport in a table.
 * @state {string} searchQuery - The current text in the search input.
 * @state {Array<object>} transportData - An array of transport objects to display.
 * @state {Array<object>} drivers - An array of available drivers for selection.
 * @state {number | null} itemToDelete - The ID of the transport item marked for deletion.
 * @returns {React.ReactElement} The TransportTable component.
 */
const TransportTable = () => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [transportData, setTransportData] = React.useState([]);
    const [drivers, setDrivers] = React.useState([]);
    const [itemToDelete, setItemToDelete] = React.useState(null);

    const fetchData = async () => {
        const transportResponse = await fetch(`/transport?search=${encodeURIComponent(searchQuery)}`);
        const staffResponse = await fetch('/staff?status=активный&position=Водитель');
        const transportData = await transportResponse.json();
        const staffData = await staffResponse.json();
        setTransportData(transportData);
        setDrivers(staffData);
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
        const response = await fetch(`/transport/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transport)
        });
        if (!response.ok) {
            const error = await response.json();
            alert(error.message);
            return;
        }
        fetchData();
    };

    const deleteTransport = async (id) => {
        const response = await fetch(`/transport/${id}`, { method: 'DELETE' });
        if (response.ok) {
            fetchData();
        } else {
            const result = await response.json();
            alert(result.message);
        }
    };

    const confirmDelete = (id) => {
        setItemToDelete(id);
        $('#confirmDeleteModal').modal('show');
    };

    /**
     * Handles the confirmation of a delete operation from the modal.
     * It calls the deleteTransport function with the stored item ID.
     */
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
        const response = await fetch('/transport', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transport)
        });
        if (!response.ok) {
            const error = await response.json();
            alert(error.message);
            return;
        }
        fetchData();
    };

    /**
     * Renders a single row in the transport table.
     * @param {object} transport - The transport object to render.
     * @returns {React.ReactElement} A table row element.
     */
    const renderRow = (transport) => {
        if (transport.id === 'new') {
            return React.createElement('tr', { key: 'new' },
                React.createElement('td', null, 'Авто'),
                React.createElement('td', null, React.createElement('select', {
                    className: 'form-control',
                    value: transport.type,
                    onChange: (e) => handleInputChange('new', 'type', e.target.value)
                }, ['грузовик', 'поезд', 'самолет'].map(opt => React.createElement('option', { key: opt, value: opt }, opt)))),
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
                    className: `form-control badge badge-${statusClassMap[transport.status] || 'info'}`,
                    value: transport.status,
                    onChange: (e) => handleInputChange('new', 'status', e.target.value)
                }, ['в работе', 'на ремонте', 'свободен'].map(opt => React.createElement('option', { key: opt, value: opt }, opt)))),
                React.createElement('td', null, React.createElement('select', {
                    className: 'form-control',
                    value: transport.driver || '',
                    onChange: (e) => handleInputChange('new', 'driver', e.target.value || null)
                }, [React.createElement('option', { key: '', value: '' }, 'Без водителя'), ...drivers.map(driver => React.createElement('option', { key: driver.id, value: driver.fullName }, driver.fullName))])),
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
        return React.createElement('tr', { key: transport.id },
            React.createElement('td', null, transport.id),
            React.createElement('td', null, React.createElement('select', {
                className: 'form-control',
                value: transport.type,
                onChange: (e) => handleInputChange(transport.id, 'type', e.target.value)
            }, ['грузовик', 'поезд', 'самолет'].map(opt => React.createElement('option', { key: opt, value: opt }, opt)))),
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
            React.createElement('td', null, React.createElement('select', {
                className: `form-control badge badge-${statusClassMap[transport.status] || 'info'}`,
                value: transport.status,
                onChange: (e) => handleInputChange(transport.id, 'status', e.target.value)
            }, ['в работе', 'на ремонте', 'свободен'].map(opt => React.createElement('option', { key: opt, value: opt }, opt)))),
            React.createElement('td', null, React.createElement('select', {
                className: 'form-control',
                value: transport.driver || '',
                onChange: (e) => handleInputChange(transport.id, 'driver', e.target.value || null)
            }, [React.createElement('option', { key: '', value: '' }, 'Без водителя'), ...drivers.map(driver => React.createElement('option', { key: driver.id, value: driver.fullName }, driver.fullName))])),
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
                    ['ID', 'Тип', 'Модель', 'Гос. Номер', 'Статус', 'Водитель', 'Затраты на обслуживание', 'Действия'].map(header => React.createElement('th', { key: header }, header))
                )
            ),
            React.createElement('tbody', null, transportData.map(transport => renderRow(transport)))
        ),
        React.createElement('button', { className: 'btn btn-success', onClick: addTransport }, 'Добавить Транспорт'),
        React.createElement(ConfirmDeleteModal, { onConfirm: handleConfirmDelete, itemId: itemToDelete })
    );
};

/**
 * A React component for managing reports in a table.
 * @state {string} searchQuery - The current text in the search input.
 * @state {Array<object>} reportsData - An array of report objects to display.
 * @state {Array<object>} managers - An array of available managers for selection.
 * @state {string} reportContent - The HTML content of the generated report.
 * @state {number | null} itemToDelete - The ID of the report marked for deletion.
 * @returns {React.ReactElement} The ReportsTable component.
 */
const ReportsTable = () => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [reportsData, setReportsData] = React.useState([]);
    const [managers, setManagers] = React.useState([]);
    const [reportContent, setReportContent] = React.useState('');
    const [itemToDelete, setItemToDelete] = React.useState(null);

    const fetchData = async () => {
        const reportsResponse = await fetch(`/reports?search=${encodeURIComponent(searchQuery)}&currentUserRole=${encodeURIComponent(currentUserRole)}`);
        const staffResponse = await fetch('/staff');
        if (!reportsResponse.ok) {
            const error = await reportsResponse.json();
            alert(error.message);
            return;
        }
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
        await fetch(`/reports/${id}?currentUserRole=${encodeURIComponent(currentUserRole)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report)
        });
        fetchData();
    };

    const deleteReport = async (id) => {
        await fetch(`/reports/${id}?currentUserRole=${encodeURIComponent(currentUserRole)}`, { method: 'DELETE' });
        fetchData();
    };

    const confirmDelete = (id) => {
        setItemToDelete(id);
        $('#confirmDeleteModal').modal('show');
    };

    /**
     * Handles the confirmation of a delete operation from the modal.
     * It calls the deleteReport function with the stored item ID.
     */
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
        await fetch(`/reports?currentUserRole=${encodeURIComponent(currentUserRole)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report)
        });
        fetchData();
    };

    const generateReport = async () => {
        const response = await fetch(`/generate-report?currentUserRole=${encodeURIComponent(currentUserRole)}`);
        if (!response.ok) {
            const error = await response.json();
            alert(error.message);
            return;
        }
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

    const exportReport = () => {
        window.location.href = `/export-report?currentUserRole=${encodeURIComponent(currentUserRole)}`;
    };

    /**
     * Renders a single row in the reports table.
     * @param {object} report - The report object to render.
     * @returns {React.ReactElement} A table row element.
     */
    const renderRow = (report) => {
        if (report.id === 'new') {
            return React.createElement('tr', { key: 'new' },
                React.createElement('td', null, 'Авто'),
                React.createElement('td', null, React.createElement('input', {
                    className: 'form-control',
                    value: report.type,
                    onChange: (e) => handleInputChange('new', 'type', e.target.value)
                })),
                React.createElement('td', null, React.createElement('input', {
                    type: 'date',
                    className: 'form-control',
                    value: report.creationDate,
                    onChange: (e) => handleInputChange('new', 'creationDate', e.target.value)
                })),
                React.createElement('td', null, React.createElement('input', {
                    className: 'form-control',
                    value: report.reportPeriod,
                    onChange: (e) => handleInputChange('new', 'reportPeriod', e.target.value)
                })),
                React.createElement('td', null, React.createElement('select', {
                    className: 'form-control',
                    value: report.author || '',
                    onChange: (e) => handleInputChange('new', 'author', e.target.value || null)
                }, [React.createElement('option', { key: '', value: '' }, 'Без автора'), ...managers.map(manager => React.createElement('option', { key: manager.id, value: manager.fullName }, manager.fullName))])),
                React.createElement('td', null, React.createElement('select', {
                    className: `form-control badge badge-${statusClassMap[report.status] || 'info'}`,
                    value: report.status,
                    onChange: (e) => handleInputChange('new', 'status', e.target.value)
                }, ['в разработке', 'утвержден', 'завершен'].map(opt => React.createElement('option', { key: opt, value: opt }, opt)))),
                React.createElement('td', null,
                    React.createElement('button', { className: 'btn btn-success btn-sm', onClick: () => saveNewReport(report) }, 'Сохранить'),
                    React.createElement('button', { className: 'btn btn-secondary btn-sm', onClick: () => setReportsData(prev => prev.filter(item => item.id !== 'new')) }, 'Отмена')
                )
            );
        }
        return React.createElement('tr', { key: report.id },
            React.createElement('td', null, report.id),
            React.createElement('td', null, React.createElement('input', {
                className: 'form-control',
                value: report.type,
                onChange: (e) => handleInputChange(report.id, 'type', e.target.value)
            })),
            React.createElement('td', null, React.createElement('input', {
                type: 'date',
                className: 'form-control',
                value: report.creationDate,
                onChange: (e) => handleInputChange(report.id, 'creationDate', e.target.value)
            })),
            React.createElement('td', null, React.createElement('input', {
                className: 'form-control',
                value: report.reportPeriod,
                onChange: (e) => handleInputChange(report.id, 'reportPeriod', e.target.value)
            })),
            React.createElement('td', null, React.createElement('select', {
                className: 'form-control',
                value: report.author || '',
                onChange: (e) => handleInputChange(report.id, 'author', e.target.value || null)
            }, [React.createElement('option', { key: '', value: '' }, 'Без автора'), ...managers.map(manager => React.createElement('option', { key: manager.id, value: manager.fullName }, manager.fullName))])),
            React.createElement('td', null, React.createElement('select', {
                className: `form-control badge badge-${statusClassMap[report.status] || 'info'}`,
                value: report.status,
                onChange: (e) => handleInputChange(report.id, 'status', e.target.value)
            }, ['в разработке', 'утвержден', 'завершен'].map(opt => React.createElement('option', { key: opt, value: opt }, opt)))),
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
                    ['ID', 'Тип', 'Дата Создания', 'Период', 'Автор', 'Статус', 'Действия'].map(header => React.createElement('th', { key: header }, header))
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

/**
 * A React component for managing routes in a table.
 * @state {string} searchQuery - The current text in the search input.
 * @state {Array<object>} routesData - An array of route objects to display.
 * @state {Array<object>} transport - An array of available transport vehicles for selection.
 * @state {number | null} itemToDelete - The ID of the route marked for deletion.
 * @returns {React.ReactElement} The RoutesTable component.
 */
const RoutesTable = () => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [routesData, setRoutesData] = React.useState([]);
    const [transport, setTransport] = React.useState([]);
    const [itemToDelete, setItemToDelete] = React.useState(null);

    const fetchData = async () => {
        const routesResponse = await fetch(`/routes?search=${encodeURIComponent(searchQuery)}`);
        const transportResponse = await fetch('/transport?status=в%20работе,свободен');
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
        const response = await fetch(`/routes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(route)
        });
        if (!response.ok) {
            const error = await response.json();
            alert(error.message);
            return;
        }
        await fetchData();
    };

    const deleteRoute = async (id) => {
        await fetch(`/routes/${id}`, { method: 'DELETE' });
        await fetchData();
    };

    const confirmDelete = (id) => {
        setItemToDelete(id);
        $('#confirmDeleteModal').modal('show');
    };

    /**
     * Handles the confirmation of a delete operation from the modal.
     * It calls the deleteRoute function with the stored item ID.
     */
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
        const response = await fetch('/routes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(route)
        });
        if (!response.ok) {
            const error = await response.json();
            alert(error.message);
            return;
        }
        await fetchData();
    };

    /**
     * Renders a single row in the routes table.
     * @param {object} route - The route object to render.
     * @returns {React.ReactElement} A table row element.
     */
    const renderRow = (route) => {
        if (route.id === 'new') {
            return React.createElement('tr', { key: 'new' },
                React.createElement('td', null, 'Авто'),
                React.createElement('td', null, React.createElement('select', {
                    className: 'form-control',
                    value: route.transportId,
                    onChange: (e) => handleInputChange('new', 'transportId', parseInt(e.target.value))
                }, transport.map(t => React.createElement('option', { key: t.id, value: t.id }, `${t.model} (${t.status})`)))),
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
                    className: `form-control badge badge-${statusClassMap[route.status] || 'info'}`,
                    value: route.status,
                    onChange: (e) => handleInputChange('new', 'status', e.target.value)
                }, ['в пути', 'доставлен', 'отменен'].map(opt => React.createElement('option', { key: opt, value: opt }, opt)))),
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
        return React.createElement('tr', { key: route.id },
            React.createElement('td', null, route.id),
            React.createElement('td', null, React.createElement('select', {
                className: 'form-control',
                value: route.transportId,
                onChange: (e) => handleInputChange(route.id, 'transportId', parseInt(e.target.value))
            }, transport.map(t => React.createElement('option', { key: t.id, value: t.id }, `${t.model} (${t.status})`)))),
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
            React.createElement('td', null, React.createElement('select', {
                className: `form-control badge badge-${statusClassMap[route.status] || 'info'}`,
                value: route.status,
                onChange: (e) => handleInputChange(route.id, 'status', e.target.value)
            }, ['в пути', 'доставлен', 'отменен'].map(opt => React.createElement('option', { key: opt, value: opt }, opt)))),
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
                    ['ID', 'Транспорт', 'Начало', 'Конец', 'Предп. Время', 'Факт. Время', 'Статус', 'Доход (в белорусских рублях)', 'Действия'].map(header => React.createElement('th', { key: header }, header))
                )
            ),
            React.createElement('tbody', null, routesData.map(route => renderRow(route)))
        ),
        React.createElement('button', { className: 'btn btn-success', onClick: addRoute }, 'Добавить Маршрут'),
        React.createElement(ConfirmDeleteModal, { onConfirm: handleConfirmDelete, itemId: itemToDelete })
    );
};

let currentUserRole = '';

/**
 * Handles the login form submission.
 * @param {Event} event - The form submission event.
 */
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
        currentUserRole = data.role;
        document.getElementById('mainContainer').style.opacity = '0';
        document.getElementById('authContainer').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('mainContainer').style.display = 'none';
            document.getElementById('authContainer').style.display = 'none';
            const dashboard = document.getElementById('dashboard');
            dashboard.style.display = 'block';
            dashboard.style.opacity = '0';
            dashboard.classList.remove('visible');
            document.body.style.background = document.body.classList.contains('dark-theme') ? '#333' : '#f4f4f9';
            setTimeout(() => {
                dashboard.style.opacity = '1';
                dashboard.classList.add('visible');
            }, 100);
        }, 500);
        document.getElementById('currentUser').textContent = username;
        document.getElementById('error-message').textContent = '';
    } else {
        document.getElementById('error-message').textContent = data.message;
    }
});

/**
 * Logs the user out of the application and returns to the login screen.
 */
function logout() {
    const dashboard = document.getElementById('dashboard');
    const mainContainer = document.getElementById('mainContainer');
    const authContainer = document.getElementById('authContainer');
    const loginForm = document.getElementById('loginForm');

    dashboard.style.opacity = '0';
    setTimeout(() => {
        dashboard.style.display = 'none';
        dashboard.classList.remove('visible');
        document.getElementById('contentArea').innerHTML = '';
        const modalContentArea = document.getElementById('modalContentArea');
        if (modalContentArea) {
            ReactDOM.unmountComponentAtNode(modalContentArea);
        }

        mainContainer.style.display = 'flex';
        authContainer.style.display = 'flex';
        mainContainer.style.opacity = '0';
        authContainer.style.opacity = '0';

        setTimeout(() => {
            mainContainer.style.opacity = '1';
            authContainer.style.opacity = '1';
            loginForm.style.display = 'block';
        }, 100);

        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('error-message').textContent = '';
        currentUserRole = '';
    }, 500);
}

/**
 * Loads a specific management section (e.g., 'cargo', 'staff') into the main modal.
 * It performs an authorization check before loading the section.
 * @param {string} section - The name of the section to load ('cargo', 'staff', 'transport', 'reports', 'routes', 'users').
 */
function loadSection(section) {
    if (section === 'users' && currentUserRole !== 'Администратор') {
        alert('Доступ запрещен: только администраторы могут управлять пользователями.');
        return;
    }
    if (section === 'reports' && !['Менеджер', 'Администратор'].includes(currentUserRole)) {
        alert('Доступ запрещен: только менеджеры и администраторы могут работать с отчётами.');
        return;
    }

    const modalContentArea = document.getElementById('modalContentArea');
    let tableComponent;

    switch (section) {
        case 'cargo':
            tableComponent = React.createElement(CargoTable);
            break;
        case 'staff':
            tableComponent = React.createElement(StaffTable);
            break;
        case 'transport':
            tableComponent = React.createElement(TransportTable);
            break;
        case 'reports':
            tableComponent = React.createElement(ReportsTable);
            break;
        case 'routes':
            tableComponent = React.createElement(RoutesTable);
            break;
        case 'users':
            tableComponent = React.createElement(UsersTable);
            break;
        default:
            return;
    }

    ReactDOM.render(tableComponent, modalContentArea);
    $('#tableModal').modal('show');
}

/**
 * Toggles the dark/light theme for the application and saves the preference in local storage.
 */
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDarkTheme = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
    document.body.style.background = isDarkTheme ? '#333' : '#f4f4f9';
}

/**
 * Applies the saved theme from local storage when the window loads.
 */
window.addEventListener('load', () => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') document.body.classList.add('dark-theme');
});
