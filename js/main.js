jQuery(function ($) {

  var timeLog = [];
  var date = new Date();
  var currentMonth = date.getMonth() + 1;
  var jsonFileName = date.getFullYear() + '-' + ((currentMonth < 10)? '0' + currentMonth : currentMonth);

  $.ajax({
    url: '/zoho-data/'+jsonFileName + '.json',
    dataType: 'json',
    success: function (date) {
      timeLog = date;
        //если есть хеш в адресе #Number, то сразу подставляеться и расчитываеться для пользователя

      if (window.location.hash) {
        $('#idPeople').val(window.location.hash.replace(/\D/g, ''));
        searchPeople();
      }

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

  function getTime(time) {
    m = Math.ceil((time % 3600) / 60);
    return Math.floor(time / 3600) + ':' + ((m < 10) ? ('0' + m) : m);
  }

  function clearPeople() {
    $('[data-block="balance-time"]').text('');
    $('[data-block="overtime"]').text('');
    $('[data-block="devtime"]').text('');
    $('[data-block="comment"]').text('');
    $('.balance').hide();
    $('button[type="clear"]').attr('disabled', true);
    window.location.hash = '';
  }

});
