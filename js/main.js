jQuery(function ($) {

  var m = moment();
  m.locale('ru'); //set russian

  var timeLog = []; // текущий день
  var date = new Date(); // текущая дата
  var currentMonth = date.getMonth() + 1;
  var currentDay = parseInt(moment().format('D'));
  var jsonFileName = moment().format('YYYY-MM');
  var workTimeList = [];

  setCurrentDay();

  $.ajax({
    url: '/zoho-data/' + jsonFileName + '.json',
    cache: false,
    dataType: 'json',
    success: function (date) {
      timeLog = date;

      //получение данных по прогуленным дням
      getPresentDays();

    }
  });

// events

  $('button[type="submit"]').on({
    'click': function () {
      searchPeople();
    }
  });

  $('button[type="clear"]').on({
    'click': function () {
      clearPeople();
      $('#idPeople').val('');
    }
  });

  $('input#idPeople').on({
    'keyup': function (e) {
      if ((e.which === 13) && (e.keyCode === 13)) {
        searchPeople();
      }
    }
  });

//functions

  function searchPeople() {
    var idPeople = $('#idPeople').val();
    window.location.hash = idPeople;

    people = timeLog.find(function (item) {
      return item.empId === idPeople;
    });

    if (people) {

      $('.balance').show();
      $('button[type="clear"]').attr('disabled', false);

      var devTime = people.devTime_tsecs;
      var overTime = people.overTime_tsecs;

      $('[data-block="balance-time"]').text(balance(overTime, devTime));

      switch (balance(overTime, devTime)[0]) {
        case '-':
          $('[data-block="comment"]').text('Работайте лучше и больше.');
          break;
        case '+':
          $('[data-block="comment"]').text('Хорошо работаете, так держать.');
          break;
      }

      $('[data-block="overtime"]').text(getTime(overTime));
      $('[data-block="devtime"]').text(getTime(devTime));

      if (workTimeList && workTimeList.length > 1) {
        goShowGraph(getPeopleTimeLog(idPeople));
      }

    } else {
      clearPeople();
    }

  }

  function balance(overTime, devTime) {

    var entry = {};

    entry.overTime_tsecs = overTime;
    entry.devTime_tsecs = devTime;

    var time = (entry.overTime_tsecs - entry.devTime_tsecs);

    var sign = time > 0 ? '+' : (time < 0 ? '-' : ' ');
    time = Math.abs(time);

    return sign + getTime(time);
  }

  function getNumberWithPrefix(number) {
    return (number < 10) ? '0' + number : number;
  }

  function getTime(time) {
    var m = Math.ceil((time % 3600) / 60);
    return Math.floor(time / 3600) + ((m === 60 ) ? 1 : 0) + ':' + ((m === 60 ) ? '00' : ((m < 10) ? ('0' + m) : m));
  }

  function clearPeople() {
    $('[data-block="balance-time"]').text('');
    $('[data-block="overtime"]').text('');
    $('[data-block="devtime"]').text('');
    $('[data-block="comment"]').text('');
    $('.balance').hide();
    $('button[type="clear"]').attr('disabled', true);
    $('#js-chart').html('');
    window.location.hash = '';
  }

  function getAllDays() {

    var processItemsDeferred = []; // для проверки зарузки всех данных по дням

    for (var day = 1; day <= currentDay; day++) {
      processItemsDeferred.push(processItem(jsonFileName + '-' + getNumberWithPrefix(day)));
    }

    $.when.apply($, processItemsDeferred).then(everythingDone);

  }

  function processItem(item) {

    var dfd = $.Deferred();

    $.ajax({
      url: '/zoho-data/' + item + '.json',
      cache: false,
      dataType: 'json',
      success: function (data) {
        workTimeList.push({'day': item, 'data': data});
        dfd.resolve()
      }
    });

    return dfd.promise();
  }

  function everythingDone() {
    workTimeList.sort(dynamicSort("day"));
    if (window.location.hash) {
      goShowGraph(getPeopleTimeLog(window.location.hash.replace(/\D/g, '')));
    }
  }

  function setCurrentDay() {
    $('.current-data').text(m.format('L'));
    setTimeout(checkDate, 60000);
  }

  function checkDate() {
    var $txtDate = $('.current-data');
    console.log('minute.... ' + m.format('L'));
    if ($txtDate.text() != m.format('L')) {
      $('.current-day').html('<div class="alert-danger text-warning">Надо обновить страницу дата сменилась!</div>');
    } else {
      $('.current-day').html('На дату: <span class="current-data">' + m.format('L') + '</span>');
      setTimeout(checkDate, 60000);
    }
  }

  function getPeopleTimeLog(idPeople) {
    var peopleWorkMonth = [];
    var currentDay = parseInt(moment().format('D')) - 1;//первый день === 0
    workTimeList.forEach(function (oneDayLog, iDay) {

      var oneDay = oneDayLog.data.find(function (item) {
        return item.empId == idPeople + '';
      });
      peopleWorkMonth.push(
        {
          "day": oneDayLog.day,
          "overTime": (isPresence(idPeople, iDay) || currentDay === iDay) ? getTime(oneDay.overTime_tsecs) : "0",
          "devTime": (isPresence(idPeople, iDay) || currentDay === iDay) ? getTime(oneDay.devTime_tsecs) : "0",
          "balance": (isPresence(idPeople, iDay) || currentDay === iDay) ? balance(oneDay.overTime_tsecs, oneDay.devTime_tsecs) : "0"
        }
      );
    });

    return peopleWorkMonth;
  }

  function isPresence(idPeople, iDay) {
    return (presenceLog.find(function (emplItem) {
      return emplItem.empId == idPeople + '';
    })[iDay].isAbsent !== true);
  }

  function dynamicSort(property) { //sort array obj field
    var sortOrder = 1;
    if (property[0] === "-") {
      sortOrder = -1;
      property = property.substr(1);
    }
    return function (a, b) {
      var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
      return result * sortOrder;
    }
  }

  function goShowGraph(timeLogPeople) {

    $('#js-chart').html('');

    $('#js-chart').highcharts({
      chart: {
        type: 'area'
      },
      title: {
        text: 'Данные на текущий момент',
        x: -20 //center
      },
      subtitle: {
        text: 'Source: http://propusk.itpark.mcn.ru/zpeople/',
        x: -10
      },
      xAxis: {
        type: 'datetime',
        categories: getCategories(timeLogPeople)
      },
      yAxis: {
        title: {
          text: 'Время ( ЧЧ : ММ )'
        },
        plotLines: [{
          value: 0,
          width: 1,
          color: '#808080'
        }],
        allowDecimals: false,
        ordinal: false
      },
      tooltip: {
        valueSuffix: ' ч'
      },
      legend: {
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle',
        borderWidth: 0
      },
      series: getSeries(timeLogPeople)
    });

  }

  function getCategories(timeLogPeople) {
    return timeLogPeople.map(function (item) {
      return item.day;
    });
  }

  function getSeries(timeLogPeople) {

    var series = [];

    series.push(
      {
        name: 'Переработки',
        data: timeLogPeople.map(function (overT) {
          return strTimeToFloat(overT.overTime, 'H.MM');
        }),
        color: '#4caf50'
      },
      {
        name: 'Недоработки',
        data: timeLogPeople.map(function (devT) {
          return strTimeToFloat(devT.devTime);
        }),
        color: '#f44336'
      },
      {
        name: 'Баланс',
        data: timeLogPeople.map(function (balance) {
          return strTimeToFloat(balance.balance);
        }),
        color: '#03a9f4'
      }
    );

    return series;
  }

  function strTimeToFloat(strTime) {
    return parseFloat(strTime.split(":")[0] + '.' + strTime.split(":")[1]);
  }

  function getPresentDays() {
    $.ajax({
      url: '/zoho-data/' + jsonFileName + '-presence' + '.json',
      cache: false,
      dataType: 'json',
      success: function (date) {
        presenceLog = date;

        //если есть хеш в адресе #Number, то сразу подставляеться и расчитываеться для пользователя
        if (window.location.hash) {
          $('#idPeople').val(window.location.hash.replace(/\D/g, ''));
          searchPeople();
        }

        getAllDays(); // загружаем все дни которые есть за текущий месяц

      }
    });
  }

});
