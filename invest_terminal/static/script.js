get_keys_branch();
//Получение ключей в заданной ветке (по стандарту - все дерево)
function get_keys_branch(branch = '') {
    //Запрос в API
    $.get({
        url: "/api/redis/get_branch",
        dataType: 'json',
        //КОСТЫЛЬ! Меняет тире на двоеточие при отправке, так как в jquery нельзя создавать объекты с ':'
        data : {branch : branch.replace(/-/g, ":")},
        success: function (data) {
            if (branch !== ''){
                $('#' + branch + '.branch').children().not(':first-child').remove();
            }
            else {
                $('.key-tree-body').html('')
            }
            console.log('Key tree start: ...\n')
            parse_keys(data['keys'], branch)
            console.log('\nKey tree end.')
        }
    })
}

//Парсинг списка ключей и вывод взависимости от типа данных
function parse_keys(keys = [], branch = '.key-tree-body'){
    console.log('\nbr: ', branch);
    //Составление дерева ключей
    keys.forEach(function (key, i){
        //Добавление новой ветки
        if (typeof(key) == 'object'){
            let new_branch_name = (branch === '' ? '' : branch + '-') + keys[i + 1]
            console.log('new_branch: ',new_branch_name)
            let new_branch = $('<details>', {
                class : 'branch',
                id : new_branch_name,
                html : `<summary><span>${keys[i + 1]}</span>&nbsp<input class="update-check"
                        type="checkbox" id="${new_branch_name}">
                        <button onclick="get_keys_branch('${new_branch_name}')" type="submit" class="btn btn-success btn-md btn-update btn-xs">
                        <i style="font-size: 10px" class="glyphicon glyphicon-refresh"></i></button>
                        </summary>`

            })
            if (branch === '') {
                $('.key-tree-body').append(new_branch);
            }
            else {
                $('#' + branch + '.branch').append(new_branch);
            }

            parse_keys(key[keys[i + 1]], new_branch_name);

        //Добавление нового ключа
        }else if (typeof keys[i - 1] != 'object') {
            let prev_id = (branch === '' ? '' : branch + '-')
            let new_key = $('<p>',{
                class : 'key',
                id : prev_id + key,
                text : key
            });
            console.log('new_key: ', new_key)
            if (branch === '') {
                $('.key-tree-body').append(new_key);
            }
            else {
                $('#' + branch + '.branch').append(new_key);
            }

            //Добавление функции получения значения по ключу после клика
            $(`#${prev_id}${key}.key`).click(function () {
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

//Авто обновление выбранной ветки с выбранным периодом
setTimeout(function update_brunch(){
    if (+$('.update-period').val()){
        let branch = $('.update-check:checked').attr('id');
        if (branch != undefined){
            get_keys_branch(branch);
        }
    }
    setTimeout(update_brunch, +$('.update-period').val() * 1000);
}, +$('.update-period').val() * 1000);

//Получить и вывести значение по ключю
function get_value(key){
    $('.value-body').html('');
    $('.form-group').remove();
    //Запрос в API
    $.get({
        url: "/api/redis/get",

        //КОСТЫЛЬ! Меняет двоеточие при запросе, так как в jquery нельзя создавать объекты с ':'
        data: {'key': key.replace(/-/g, ":")},
        success : function (data){
            console.log(`get ${key}: ${JSON.stringify(data)}`);
            let value_type = data['value_type'];
            let value = data['value']

            //КОСТЫЛЬ! Меняет двоеточие при запросе, так как в jquery нельзя создавать объекты с ':'
            //Строка состояние (текущий ключ и его тип)
            $('.key-name').text(key.replace(/-/g, ":"));
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
                        class : "table table-dark table-bordered value-table",
                        cellspacing : "0",
                        html :`<thead class="thead-dark">
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
        error : function (xhr, textStatus, error){
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
    let row = $('<tr>', {
        class: "table-item",
        html: `<th class="item-index">
                    <button onclick="change_to_remove(this)" type="submit" class="btn btn-danger btn-md btn-remove btn-xs">
                        <i style="font-size: 10px" class="glyphicon glyphicon-remove"></i>
                    </button>&nbsp
                    ${index}
                </th>
               <th class="item-value">${value}</th>`
    })
    return row
}

//Кнопка изменения значения
function edit_form(){
    let btn_value;
    let form = $('<div>',{
        class : "form-group"
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
            class : "btn btn-success mb-2",
            type : "submit",
            text : btn_value,
            onclick : "edit_value()"
    }))
    form.append($('<button>',{
            class : "btn btn-success btn-md btn-update btn-md",
            type : "submit",
            html : '<i style="font-size: 10px" class="glyphicon glyphicon-refresh"></i>',
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
            data : {'key' : key,
                    'value' : JSON.stringify(value)},
            success : function (data){
                $(".btn-save").prop('disabled', true);
                console.log(data);
                get_value(key);
            },
            error : function (xhr, textStatus, error) {
                alert(xhr.responseJSON['message'])
            }
    })
}

$(".db-selector").change(function (){
    $.post({
            url : '/api/redis/select',
            dataType: 'json',
            data : {'db' : $(".db-selector").val()},
            success : function (data){
                console.log(data);
                get_keys_branch();
            },
            error : function (xhr, textStatus, error) {
                alert(xhr.responseJSON['message']);
            }
    })
})