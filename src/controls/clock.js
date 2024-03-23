import moment from 'moment';
import 'moment-timezone';

function ultraClock(properties) {



  let offsetDifference = 0;
  const canvas = document.createElement('canvas');
  canvas.id = 'canvas';
  canvas.width = 200;
  canvas.height = 200;
  canvas.style = 'position: absolute; bottom: 120px; left: 2%;';
  var ctx = canvas.getContext("2d");
  var radius = canvas.height / 2;

  var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  radius = radius * 0.90
  const hiddenCanvas = document.createElement('canvas');
  hiddenCanvas.id = 'hiddenCanvas';
  hiddenCanvas.style = 'position: absolute; bottom: 120px; left: 2%; filter: blur(5px); pointer-events: none;';

  hiddenCanvas.width = canvas.width;
  hiddenCanvas.height = canvas.height;
  var hiddenCtx = hiddenCanvas.getContext('2d');
  hiddenCtx.translate(radius, radius);

  ctx.translate(radius, radius);

  var date = new Date();
  var touchX;
  var listeners = [];

  document.body.appendChild(hiddenCanvas);
  document.body.appendChild(canvas);
  drawClock();

  canvas.addEventListener('mousedown', function (event) {
    touchX = event.clientX - event.clientY;
  });

  document.addEventListener('mousemove', function (event) {
    if (typeof touchX === "undefined") return;
    var x = 2 * ((event.clientX - event.clientY) - touchX);
    touchX = event.clientX - event.clientY;
    date.setMinutes(date.getMinutes() + x);
    drawClock();

  });

  document.addEventListener('mouseup', function (event) {
    touchX = undefined;
  });

  // Similar events for touch devices

  canvas.addEventListener('touchstart', function (event) {
    touchX = event.touches[0].clientX - event.touches[0].clientY;
  });

  document.addEventListener('touchmove', function (event) {
    if (typeof touchX === "undefined") return;
    var touch = event.touches[0];
    var x = 4 * ((touch.clientX - touch.clientY) - touchX);
    touchX = touch.clientX - touch.clientY;
    date.setMinutes(date.getMinutes() + x);
    drawClock();
  });

  document.addEventListener('touchend', function (event) {
    if (event.touches.length == 0) {
      touchX = undefined;
    }
  });

  function drawClock() {

    drawTime(hiddenCtx, radius);
    drawTime(ctx, radius);
    listeners.forEach(listener => listener(date));
  }


  function drawTime(ctx, radius) {
    const localDate = new Date(date);
    localDate.setMinutes(localDate.getMinutes() - offsetDifference)
    ctx.clearRect(-radius, -radius, radius * 2, radius * 2);


    const hours = localDate.getHours();
    const minutes = localDate.getMinutes();
    var fraction = (minutes + (hours * 60)) / 1440;
    ctx.beginPath();
    const start = -0.5 * Math.PI;
    const end = start + (fraction * 2 * Math.PI)
    ctx.arc(0, 0, radius * 0.9, start, end);
    ctx.strokeStyle = "turquoise"
    ctx.lineCap = "round"
    ctx.lineWidth = radius * 0.1;
    ctx.stroke();


    var x = radius * 0.9 * Math.cos(end);
    var y = radius * 0.9 * Math.sin(end);

    // Draw a white circle at the end of the arc
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.1, 0, 2 * Math.PI);  // Change radius*0.05 to change the size of the circle
    ctx.fillStyle = "white";
    ctx.fill();

    ctx.font = radius * 0.25 + "px arial";  // Adjust the size of the text with the radius
    ctx.textBaseline = "middle";  // To ensure the text is centered vertically
    ctx.textAlign = "center";  // To ensure the text is centered horizontally
    var timeStr = (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes;
    ctx.fillText(timeStr, 0, radius * -0.1);

    var day = localDate.getDate();
    var monthIndex = localDate.getMonth();
    var year = localDate.getFullYear();
    var dateStr = day + ' ' + monthNames[monthIndex] + ' ' + year;
    ctx.font = radius * 0.15 + "px arial";  // Adjust the size of the text with the radius
    ctx.fillText(dateStr, 0, radius * 0.2);
  }

  if(properties && properties.dateTimePicker){
    const datetimePickerElement = document.createElement('input');
    datetimePickerElement.id = 'datetime-picker';
    datetimePickerElement.type = 'text';
    datetimePickerElement.style = 'position: absolute; bottom: 120px; left: 2%; display: none;';
    document.body.appendChild(datetimePickerElement);
  
    const flatpickrCSS = document.createElement('link');
    flatpickrCSS.rel = 'stylesheet';
    flatpickrCSS.href = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css';
    document.head.appendChild(flatpickrCSS);
  
    // Dynamically load the Flatpickr JavaScript
    const flatpickrScript = document.createElement('script');
    flatpickrScript.src = 'https://cdn.jsdelivr.net/npm/flatpickr';
    flatpickrScript.onload = () => {
      var datetimePicker = flatpickr('#datetime-picker', {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
      });
  
      let mouseDownX = 0;
      let mouseDownY = 0;
  
      // Event listener for mouse down
      canvas.addEventListener('mousedown', function (event) {
        // Store the mouse position on mouse down
        mouseDownX = event.clientX;
        mouseDownY = event.clientY;
      });
      canvas.addEventListener('mouseup', function (event) {
        const distanceMoved = Math.sqrt(Math.pow(event.clientX - mouseDownX, 2) + Math.pow(event.clientY - mouseDownY, 2));
  
        const threshold = 5;
  
        if (distanceMoved < threshold) {
          datetimePicker.open();
        }
      });
      
  
      // update the date and redraw the clock when a date is selected
      datetimePicker.config.onChange.push(function (selectedDates, dateStr, instance) {
        date = selectedDates[0];
        date.setMinutes(date.getMinutes() + offsetDifference)
        drawClock();
      });
    };
    document.head.appendChild(flatpickrScript);
  }
  




  //// timezone
  if (properties && properties.timezone) {
    const blurredSelect = document.createElement('select');
    blurredSelect.style.cssText = '-webkit-user-select: none;-moz-user-select: none;-ms-user-select: none;user-select: none; padding-left: 20px; width: 180px; height: 40px; position: absolute; top: 60px; left: 10px; border: 4px solid #66CDAA; border-radius: 18px; filter: blur(4px); z-index: 1; pointer-events: none;';

    // Create the second select element for actual user interaction
    const timezoneSelect = document.createElement('select');
    timezoneSelect.id = 'timezoneSelect';
    timezoneSelect.style.cssText = '-webkit-user-select: none;-moz-user-select: none;-ms-user-select: none;user-select: none; padding-left: 20px; width: 180px; height: 40px; position: absolute; top: 60px; left: 10px; border: 4px solid #66CDAA; background-color: transparent; border-radius: 18px; z-index: 2;';

    document.body.appendChild(blurredSelect);
    document.body.appendChild(timezoneSelect);

    window.addEventListener('DOMContentLoaded', (event) => {

      const timezones = moment.tz.names();
      const guessedTimezone = moment.tz.guess();

      timezones.forEach(timezone => {
        const option = document.createElement('option');
        option.value = timezone;
        option.text = timezone;
        if (timezone === guessedTimezone) {
          option.selected = true;
        }
        timezoneSelect.appendChild(option);
      });

      timezoneSelect.addEventListener('change', function () {
        const selectedTimezone = this.value;
        let now = moment();

        const loc = moment.tz.guess();
        // Get the offset in minutes from UTC for local timezone
        let localOffset = new Date().getTimezoneOffset();

        // Get the offset in minutes from UTC for selected timezone
        let selectedOffset = moment.tz.zone(selectedTimezone).utcOffset(now);

        // Get the difference between the two offsets
        offsetDifference = selectedOffset - localOffset;

        drawClock();
      });
    });
  }


  function addListener(func) {
    listeners.push(func);
    drawClock();
  }

  function setDate(aDate) {
    date = aDate;
    drawClock();
  }
  function getDate() {
    return date;
  }

  return { addListener: addListener, setDate: setDate, getDate: getDate }
}

export { ultraClock };