<template>
  <div class="chart-wrapped">
    <div v-if="!above" class="chart-wrap-table"><slot/></div>
    <a v-bind:href="'#skip-' + id" class="govuk-skip-link">Skip chart</a>
    <div v-if="id != null" class="govuk-grid-row">
      <div v-bind:id="'chart-container-' + id">
         <div v-for="chart in charts" v-bind:key="chart.id"
             v-bind:class="{'govuk-grid-column-one-half':(charts.length>1),
                            'govuk-grid-column-full':(charts.length == 1)}" >
           <caption class="govuk-caption-m" v-if="chart.title">{{ chart.title }}</caption>
           <div v-bind:id="chart.id" class="chart-box">
           </div>
        </div>
      </div>
    </div>
    <a v-bind:name="'skip-' + id"></a>
    <div v-if="above" class="chart-wrap-table"><slot/></div>
  </div>
</template>

<script>
import c3 from 'c3'
import * as d3 from 'd3'

export default {
  name: 'TablePlot',
  components: {
  },
  data () {
    return {
      id: null,
      type: 'none',
      tableData: [[]],
      xAxis: null,
      yAxis: null,
      charts: [],
      c3Charts: [],
      above: false,
      separate: false,
      order: null,
      stacked: false,
      smoothed: true,
      palette: null,
      rotated: false,
      reversed: false,
      height: 500,
      caption: null
    }
  },
  methods: {
    getTableData: function () {
      var table = this.$el.querySelector('TABLE')
      var id = table.getAttribute('id')
      console.log('Table found: ' + id)
      this.id = 'table-chart-' + id
      console.log('Chart id: ' + this.id)
      this.caption = table.querySelector('CAPTION').textContent
      console.log(this.caption)

      var data = []

      if (table.rows[0]) {
        for (let y = 0; y < table.rows.length; y++) {
          data.push([])
          for (let x = 0; x < table.rows[y].cells.length; x++) {
            data[y][x] = table.rows[y].cells[x].textContent.trim()
            if ((x * y) > 0) {
              data[y][x] = parseFloat(data[y][x])
            }
          }
        }
      }

      // Reverse the rows and put the first row back at the front.
      if (this.reversed) {
        console.log('reversing')
        data = data.reverse()
        data.unshift(data.pop())
      }

      this.tableData = data
    },

    loadAttributes: function () {
      var attributes, attName, attValue
      console.log(this)
      attributes = this.$attrs

      for (attName in attributes) {
        attValue = this.parseAttributeValue(attributes[attName])
        switch (attName) {
          case 'x-axis':
            attName = 'xAxis'
            break
          case 'y-axis':
            attName = 'yAxis'
            break
          case 'height':
            attValue = parseFloat(attValue)
            break
        }
        this[attName] = attValue
        console.log(attName, this[attName])
      }
    },

    parseAttributeValue: function (value) {
      let parsed = null

      switch (value) {
        case 'true':
          parsed = true
          break

        case 'false':
          parsed = false
          break

        case '':
        case 'null':
          parsed = null
          break

        default:
          parsed = value
          break
      }
      return parsed
    },

    buildChartData: function () {
      // clone the table data
      var i, chartData, options, chart, seriesData, title
      this.charts = []
      chartData = this.tableData.slice(0)

      switch (this.series) {
        case 'columns':
        case 'cols':
          chartData = this.transpose(chartData)
          break
      }

      options = this.getChartOptions()

      if (this.separate) {
        console.log('separate:true')
        for (i = 1; i < chartData.length; i++) {
          seriesData = [
            chartData[0],
            chartData[i]
          ]

          if (options.isPie | options.isDonut) {
            seriesData = this.transpose(seriesData)
          }

          title = chartData[i][0]

          options.index = (i - 1)

          chart = this.buildChartObject(this.id, options, seriesData)
          chart.title = title

          this.charts.push(chart)
        }
      } else {
        console.log('separate:false')

        options.index = 0

        chart = this.buildChartObject(this.id, options, chartData)
        this.charts.push(chart)
      }
    },

    getChartType: function () {
      var prepend = ''; var append = ''

      if (this.smoothed) {
        switch (this.type) {
          case 'line':
            prepend = 'sp'
            break
          case 'area':
            append = '-spline'
            break
        }
      }

      return prepend + this.type + append
    },

    getRowHeadings: function (data) {
      var i; var headings = []
      for (i = 1; i < data.length; i++) {
        headings.push(data[i][0])
      }
      console.log('headings', headings)
      return headings
    },

    getColHeadings: function (data) {
      var i; var headings = []
      for (i = 1; i < data[0].length; i++) {
        headings.push(data[0][i])
      }
      return headings
    },

    getTypeList: function (headings) {
      var i; var types = {}
      for (i in headings) {
        types[headings[i]] = this.getChartType()
      }

      console.log('types', types)

      return types
    },

    getChartOptions: function () {
      var options = {
        type: this.type,
        isBar: false,
        isPie: false,
        isDonut: false,
        axisData: this.getAxisData()
      }

      switch (this.type) {
        case 'donut':
          options.isDonut = true
          options.dataLabels = {
            format: function (value, ratio, id) {
              console.log(id)
              return d3.format('.0%')(ratio)
            }
          }
          break
        case 'pie':
          options.isPie = true
          options.dataLabels = {
            format: function (value, ratio) {
              return d3.format('.0%')(ratio)
            }
          }
          break
        case 'bar':
          options.isBar = true
          options.dataLabels = {
            format: function (v, id) {
              return id + ' (' + v + ')'
            }
          }
          break
        default:
          options.dataLabels = {
            format: function (v) {
              return v
            }
          }
          break
      }

      return options
    },

    buildChartObject: function (id, options, chartData) {
      let types, selector, chart, chartId

      chartId = 'chart-container-' + id + '-chart-' + options.index
      selector = '#' + chartId

      options.axisData.categories = this.getColHeadings(chartData)
      // options.axisData.x.categories = this.getColHeadings(chartData)
      // options.axisData.y.categories = this.getColHeadings(chartData)

      types = this.getTypeList(this.getRowHeadings(chartData))

      chart = {
        id: chartId,
        bindto: selector,
        data: {
          x: chartData[0][0],
          columns: chartData,
          type: this.getChartType(),
          types: types
        },
        axis: options.axisData
      }

      if (this.order) {
        chart.data.order = this.order
      }

      if (this.height) {
        chart.size = {
          height: parseFloat(this.height)
        }
      }

      if (this.palette) {
        let palette = null
        let type = typeof this.palette
        console.log('Palette data type', type)
        console.log('Palette', this.palette)
        switch (true) {
          case ((type === 'string') &&
                        /^\[.*\]$/.test(this.palette)):
            console.log('Custom palette')
            try {
              palette = JSON.parse(this.palette)
            } catch (err) {
              console.log('Parse error', err)
            }
            break
          case ((type === 'string') &&
                        /^[a-zA-Z0-9_]+$/.test(this.palette)):
            console.log('Named palette')
            palette = this.getPalettePattern(this.palette)
            break
          case (type === 'array'):
            console.log('Custom palette')
            palette = this.palette
            break
          default:
            console.log('Default palette')
        }
        if (palette) {
          chart.color = {
            pattern: palette
          }
        }
      }

      switch (this.type) {
        case 'pie':
        case 'donut':
          chart[this.type] = {
            label: options.dataLabels
          }
          break
        case 'bar':
        case 'line':
        case 'area':
          if (this.stacked) {
            let groups = this.getRowHeadings(chartData)
            console.log('groups', groups)
            chart.data.groups = [groups]
          }
          break
        default:
          chart.data.labels = options.dataLabels
          chart.padding = {
            right: 20
          }
      }
      return chart
    },

    getAxisData: function () {
      var xLabel = this['xAxis']
      var yLabel = this['yAxis']

      var axisData = {
        x: {
          type: 'category',
          label: {
            text: xLabel,
            position: 'outer-center'
          }
        },
        y: {
          label: {
            text: yLabel,
            position: 'outer-middle'
          }
        }
      }
      axisData.rotated = this.rotated

      return axisData
    },

    drawCharts: function () {
      var i, chart
      this.c3Charts = []

      for (i in this.charts) {
        (function (vue, i) {
          chart = vue.charts[i]
          console.log('chart', chart)
          vue.c3Charts.push(c3.generate(chart))
        })(this, i)
      }

      // window.addEventListener('hashchange', this.hashchange, false)
    },

    hashchange: function () {
      console.log('Rerendering charts following hash change')
      this.rerender()
    },

    rerender: function () {
      var i, chart
      for (i in this.c3Charts) {
        chart = this.c3Charts[i]
        chart.flush()
      }
    },

    transpose: function (sourceData) {
      var targetData = []
      var sourceRows, sourceCols

      sourceCols = sourceData[0].length
      sourceRows = sourceData.length

      for (var y = 0; y < sourceRows; y++) {
        for (var x = 0; x < sourceCols; x++) {
          let cell = sourceData[y][x]

          if (!targetData[x]) targetData[x] = []

          targetData[x][y] = cell
        }
      }

      return targetData
    },

    getPalettePattern (palette) {
      var palettes = {
        govuk: [
          '#005ea5', // blue
          '#ffbf47', // yellow
          '#2e358b', // purple
          '#006435', // green
          '#f47738', // orange
          '#2b8cc4', // light-blue
          '#28a197', // turquoise
          '#f499be', // light-pink
          '#b10e1e', // red
          '#6f72af', // light-purple
          '#d53880', // pink
          '#df3034', // bright-red
          '#912b88', // bright-purple
          '#b58840', // brown
          '#85994b' // light-green
        ],
        monochrome_blue: ['#0F084B', '#26408B', '#3D60A7', '#81B1D5', '#A0D2E7'],
        monochrome_purple: ['#4B0F08', '#8B2640', '#A73D60', '#D581B1', '#E7A0D2'],
        monochrome_green: ['#084B0F', '#408B26', '#60A73D', '#B1D581', '#D2E7A0']
      }

      return palettes[palette]
    },

    render () {
      this.getTableData()
      this.buildChartData()
      this.drawCharts()
    }
  },
  mounted () {
    console.log('MOUNTED')
    this.getTableData()
    this.buildChartData()
    if (this.type !== 'none') {
      // TODO - fix this.
      // this.drawCharts()
      window.setTimeout(this.render, 500)
    }
  },
  beforeCreate: function () {
    console.log('BEFORE CREATE')
  },
  created: function () {
    console.log('CREATED')
  },
  beforeMount: function () {
    console.log('BEFORE MOUNT')
    this.loadAttributes()
  }
}
</script>

<style scoped>
.chart-box {
  background-color: #fafafa;
  outline: 1px solid #ddd;
  padding: 1em 0;
  margin-bottom:2em;
}
</style>
