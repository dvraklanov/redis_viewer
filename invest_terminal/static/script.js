const key_split = ":"
const new_key_split = "-_-";

$(document).ready(function() {
    db_change();
    get_branch();
    //Авто обновление выбранной ветки с выбранным периодом
    setTimeout(function update_brunch(){
        if (+$('.update-period').val()){
            let branch = $('.update-check:checked').attr('id');
            if (branch !== undefined){
                get_branch(branch);
            }
        }
        setTimeout(update_brunch, +$('.update-period').val() * 1000);
        }, +$('.update-period').val() * 1000);

    // Изменить базу данных в redis (0-15)
    $(".db-selector").change(function (){db_change()})
});

//Получение ключей в заданной ветке (по стандарту - все дерево)
function get_branch(branch = '', cursor = 0, count = 100) {
    //Запрос в API
    $.get({
        url: "/api/redis/get_branch",
        dataType: 'json',
        data : {cursor: cursor,
                // Костыль! Двоеточие меняется на другой разделитель
                branch : branch.replace(new RegExp(new_key_split, 'g'), key_split),
                count: count},
        success: function (data) {

            console.log(data);
            parse_branch(data);
            if (data['cursor'] !== 0) get_branch(branch, data['cursor']);
        }
    })
}

//Парсинг списка ключей и вывод взависимости от типа данных
function parse_branch(branch = {}){
    //Составление дерева ключей
    let parent;
    if (branch['parent'] === "") parent = "main-branch"
    else parent = branch['parent']

    branch['branches'].forEach(function (item){

        // Костыль! Двоеточие меняется на другой разделитель
        let item_r = item.replace(new RegExp(key_split, 'g'), new_key_split);
        // Добавить новую ветку, если не существует
        if (!$(`#${item_r}.branch`).length){
            let new_branch_name = item_r.split(new_key_split);
            new_branch_name = new_branch_name[new_branch_name.length-1];
            console.log('new_branch: ',new_branch_name);
            let new_branch = document.createElement('details');
            new_branch.id = item_r;
            new_branch.className = 'branch';
            // Костыль! Двоеточие меняется на другой разделитель
            new_branch.innerHTML = `<summary onclick="add_loaded(this, '${item_r}')">
                                    <span>${new_branch_name}</span>&nbsp<input class="update-check"
                                    type="checkbox" id = '${item_r}'>
                                    <button onclick="get_branch('${item_r}')" type="submit"
                                    class="btn btn-success btn-sm btn-update">
                                    <i class="bi bi-arrow-clockwise"></i></button>
                                    </summary>`

            // Костыль! Двоеточие меняется на другой разделитель
            document.querySelector('#' + parent.replace(new RegExp(key_split, 'g'), new_key_split) + '.branch').appendChild(new_branch);
        }
    })
    branch['keys'].forEach(function (item){

        // Костыль! Двоеточие меняется на другой разделитель
        let item_r = item.replace(new RegExp(key_split, 'g'), new_key_split);
        if (!$(`#${item_r}.key`).length){

            let new_key_name = item_r.split(new_key_split);
            new_key_name = new_key_name[new_key_name.length-1];
            console.log('new_key: ', new_key_name);

            let new_key = document.createElement('p');
            new_key.id = item_r;
            new_key.className = 'key';
            new_key.innerText = new_key_name;

            // Костыль! Двоеточие меняется на другой разделитель
            document.querySelector('#' + parent.replace(new RegExp(key_split, 'g'), new_key_split) + '.branch').appendChild(new_key)

            $(`#${item_r}.key`).click(function () {
                $('.key').each(function() {
                    $(this).removeClass('choice');
                });
                $(".btn-save").prop('disabled', true);
                $(this).addClass("choice");
                get_value($(this).attr('id'))
            })
        }

    })
        //Выбор обновляемой ветки
    $('.update-check').click(function(){
        if ($(this).is(':checked')) {
             $('.update-check').not(this).prop('checked', false);
        }
    });
}

//Прогрузка ветки по нажатию
function add_loaded(e, item){
    if (!$(e).parents().first().hasClass('loaded')){
        get_branch(item);
        $(e).parents().first().addClass('loaded');
    }
}

//Получить и вывести значение по ключю
function get_value(key){
    $('.value-body').html('');
    $('.form-group').remove();
    //Запрос в API
    $.get({
        url: "/api/redis/get",
        // Костыль! Двоеточие меняется на другой разделитель
        data: {'key': key.replace(new RegExp(new_key_split, 'g'), key_split)},
        success : function (data){
            console.log(`get ${key}: ${JSON.stringify(data)}`);
            let value_type = data['value_type'];
            let value = data['value']

            //Строка состояние (текущий ключ и его тип)
            // Костыль! Двоеточие меняется на другой разделитель
            $('.key-name').text(key.replace(new RegExp(new_key_split, 'g'),  key_split));
            $('.value-type').text(value_type);
            $('.value-heading').append(edit_form());
            //Вывод значения в зависимости от типа
            if (value_type === 'string'){
                let str = $('<span>',{
                        class : 'value-string',
                        text: data['value']
                })
                $('.value-body').append(str)
            }
            else if (['list', 'set', 'zset', 'hash'].indexOf(value_type) !== -1){
                $('.value-body').append(function (){
                    //Составление таблицы из массива
                    let table = $('<table>',{
                        class : "table value-table",
                        cellspacing : "0",
                        html :`<thead class="thead">
                                    <tr><th width="25%" scope="col">#</th><th scope="col">Значение</th></tr>
                               </thead>`,
                    });
                    let table_body = $('<tbody>')
                    if (['list', 'set'].indexOf(value_type) !== -1){
                        for (let i = 0; i < value.length; ++i){
                            table_body.append(table_row(i + 1, value[i]))
                        }
                    }else if (['hash', 'zset'].indexOf(value_type) !== -1){
                        for (let hkey in value){
                            table_body.append(table_row(hkey, value[hkey]))
                        }
                    }
                    table.append(table_body)
                    return table;
                    }
                )
            }
        },
        error : function (xhr){
            alert(xhr.responseJSON['message'])
        }
    })
}


//Добавить в список/множество/словарь новое значение или изменить строку
function edit_value(){
    let value_type = $('.value-type').text();
    let new_value = $('.new-value-input').val();
    if (new_value !== ''){
        if (value_type === 'string'){
            $(".value-string").text(new_value);
        }else if (['list', 'set'].indexOf(value_type) !== -1){
            let new_index = $('.value-table tbody tr').length + 1;
            $('.value-body tbody').append(table_row(new_index, new_value).addClass('bg-add'));
        }else if (['hash', 'zset'].indexOf(value_type) !== -1){
            let new_key = $('.new-value-hkey-input').val();
            if (new_key !== ''){
                if (value_type === 'zset' && /^\d+$/.test(new_key)){
                    $('.value-body tbody').append(table_row(new_key, new_value).addClass('bg-add'));
                }
                else if (value_type === 'hash'){
                    $('.value-body tbody').append(table_row(new_key, new_value).addClass('bg-add'));
                }

            }
        }
        reset_input();
    }

}

//Строка таблицы
function table_row(index, value){
    return $('<tr>', {
        class: "table-item",
        html: `<th class="item-index">
                    <button onclick="change_to_remove(this)" type="submit" class="btn btn-danger btn-md btn-remove btn-xs">
                        <i class="bi bi-eraser"></i>
                    </button>&nbsp
                    ${index}
                </th>
               <th class="item-value">${value}</th>`
    })
}

//Кнопка изменения значения
function edit_form(){
    let btn_value;
    let form = $('<div>',{
        class : "form-group value-edit-form"
    })
    let value_type = $('.value-type').text();

    if (value_type === 'string') btn_value = "Изменить"
    else if (['list', 'set', 'hash', 'zset'].indexOf(value_type) !== -1){
        btn_value = "Добавить"
        if (['hash', 'zset'].indexOf(value_type) !== -1){
            form.append($('<input>', {
                class : "form-control new-value-hkey-input",
                type : "text",
                placeholder : "Новый ключ"
            }))
        }
    }
    form.append($('<input>', {
        class : "form-control new-value-input",
        type: "text",
        placeholder: "Новое значение",
        }))
    form.append($('<button>',{
            class : "btn btn-success",
            type : "submit",
            text : btn_value,
            onclick : "edit_value()"
    }))
    form.append($('<button>',{
            class : "btn btn-success btn-update",
            type : "submit",
            html : '<i class="bi bi-arrow-clockwise"></i>',
            onclick : `get_value("${$('.key-name').text()}")`
    }))
    return form;
}

//Отметка как удаленного элемента
function change_to_remove(e){
    let row = $(e).parents('.table-item');
    reset_input();
    if (row.hasClass('bg-remove')){
        row.removeClass('bg-remove');
    } else {
        row.removeClass('bg-add');
        row.addClass('bg-remove');
    }

}

//Сброс поля ввода и кнопки "Сохранить"
function reset_input() {
    $('.new-value-input').val('');
    $('.new-value-hkey-input').val('');
    $(".btn-save").prop('disabled', false);
}

//Сохранить значение
function save_value(){
    let value_type = $('.value-type').text();
    let key = $('.key.choice').attr('id')
    let value

    if (value_type === 'string'){
        value = $('.value-string').text();
    }else if (['list', 'set'].indexOf(value_type) !== -1){
        let new_list = [];
        $('.table-item').each(function (){
            if (!($(this).hasClass('bg-remove'))){
                let item_value = $(this).children().last().text()
                new_list.push(item_value);
            }
        })
        value = new_list;
    }else if (['hash', 'zset'].indexOf(value_type) !== -1){
        let new_dict = {};
        $('.table-item').each(function (){
            if (!($(this).hasClass('bg-remove'))){
                let hkey = $(this).children().first().text();
                new_dict[hkey] = $(this).children().last().text();
            }
        })
        value = new_dict
    }
    console.log(`set ${key}: ${value}`)
    //Записать новое значение в redis
    $.post({
            url : '/api/redis/set',
            dataType: 'json',
            // Костыль! Двоеточие меняется на другой разделитель
            data : {'key' : key.replace(new RegExp(new_key_split, 'g'), key_split),
                    'value' : JSON.stringify(value)},
            success : function (data){
                $(".btn-save").prop('disabled', true);
                console.log(data);
                get_value(key);
            },
            error : function (xhr) {
                alert(xhr.responseJSON['message'])
            }
    })
}

function db_change(){
    $.post({
            url : '/api/redis/select',
            dataType: 'json',
            data : {'db' : $(".db-selector").val()},
            success : function (data){
                console.log(data);
                $('#main-branch.branch').html('');
                get_branch();
            },
            error : function (xhr) {
                alert(xhr.responseJSON['message']);
            }
    })
}

