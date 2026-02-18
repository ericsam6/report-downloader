import { Browser, Page } from 'puppeteer';
import { injectD3 } from '../utils/d3Helper';

export class BreakevenReport {
    data: any = {};
    chart_data: any[] = [];
    title: string = "";

    constructor(data: any) {
        this.data = data;
        this.title = "Demo Company - Breakeven";
        this.init_breakeven();
    }

    /**
     * Generates the PDF for this specific report instance
     */
    public async generate(browser: Browser): Promise<Uint8Array> {
        const page = await browser.newPage();

        try {
            // 1. Setup Debugging
            page.on('console', msg => console.log(`[Breakeven Report Log]: ${msg.text()}`));

            // 2. Set Basic HTML Structure
            await page.setContent(this.getHtmlTemplate());

            // 3. Inject D3 Library
            await injectD3(page);

            // 4. Draw the Chart inside the browser context
            await this.drawChart(page);

            // 5. Generate PDF
            // printBackground is essential for charts to be visible
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '20px', bottom: '20px' }
            });

            return pdfBuffer;

        } catch (error) {
            console.error("Error generating Breakeven Report:", error);
            throw error;
        } finally {
            await page.close();
        }
    }

    private init_breakeven() {
        const d = this.data;
        const revenue = d.revenue || 0;
        const fixedCosts = d.fixedcosts || 0;
        const grossProfit = d.gross_profit || 0;
    
        const varExpRatio = revenue ? grossProfit / revenue : 0;
        const breakingPoint = varExpRatio ? fixedCosts / varExpRatio : 0;
    
    
        // Calculate variable expense for the line slope
        this.data.variable_expense = Math.round((1.00 - (Math.round(varExpRatio * 100) / 100)) * 100) / 100;
        this.data.breaking_point = breakingPoint;
    
        this.data['margin_safety'] = this.data['revenue'] - this.data['breaking_point'];
    
        this.chart_data = [
          { name: 'revenue', value: revenue },
          { name: 'expenses', value: d.expenses },
          { name: 'fixedcosts', value: fixedCosts },
          { name: 'breaking_point', value: breakingPoint }
        ];
    
      }

    private getHtmlTemplate(): string {
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 40px; }
            h1 { text-align: center; color: #333; }
            .chart-container { 
              display: flex; 
              justify-content: center; 
              margin-top: 50px; 
              height: 400px;
            }
          </style>
        </head>
        <body>
          <h1>${this.title}</h1>
          <div id="chart" class="chart-container"></div>
        </body>
      </html>
    `;
    }

    private async drawChart(page: Page): Promise<void> {
        const payload = {
            chartData: this.chart_data,
            metrics: this.data
        };
        // Pass the class data into the browser context
        await page.evaluate((payload) => {

            if (!window.d3) return;

            const chartData = payload.chartData;
            const metrics = payload.metrics;
            const d3Instance = window.d3;

            const margin = { top: 15, right: 30, bottom: 15, left: 60 };
            const width = 500 - margin.left - margin.right;
            const height = 300 - margin.top - margin.bottom;

            const maxVal = d3Instance.max(chartData, (d: any) => d.value) || 100;
            const zoom = maxVal * 1.75;

            const svg = window.d3.select("#chart")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

            const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

            const x = d3Instance.scaleLinear().range([0, width]).domain([0, zoom]);
            const y = d3Instance.scaleLinear().range([height, 0]).domain([0, zoom]);

            // 1. Draw Background Path (Profit/Loss Area)
            const startX = x(metrics.breaking_point);
            const startY = y(metrics.breaking_point);
            const revX = x(metrics.revenue);
            const expY = y(metrics.expenses);
            const revY = y(metrics.revenue);

            g.append('path')
                .attr('d', `M${startX},${startY} L${revX},${expY} V${revY} Z`)
                .attr('fill', revX > startX ? 'green' : 'red')
                .attr('fill-opacity', 0.2);

            // 2. Fixed Cost Line (Static - no transition)
            g.append("line")
                .attr("x1", 0)
                .attr("x2", width)
                .attr("y1", y(metrics.fixedcosts))
                .attr("y2", y(metrics.fixedcosts))
                .style("stroke", "#777777")
                .style("stroke-width", "2px");

            // 3. Revenue Line
            g.append("line")
                .attr("x1", 0)
                .attr("y1", height)
                .attr("x2", x(zoom))
                .attr("y2", y(zoom))
                .style("stroke", "#9ebd66")
                .style("stroke-width", "2px");

            // 4. Expense Line (Fixed + Variable)
            g.append("line")
                .attr("x1", 0)
                .attr("y1", y(metrics.fixedcosts))
                .attr("x2", width)
                .attr("y2", y(metrics.fixedcosts + (zoom * metrics.variable_expense)))
                .style("stroke", "#dd392c")
                .style("stroke-width", "2px");

            // 5. Add X Grid Lines
            g.append("g")
                .attr("class", "grid")
                .attr("transform", `translate(0,${height})`)
                .call(d3Instance.axisBottom(x)
                    .ticks(8)
                    .tickSize(-height) // This extends the line UPWARDS
                    .tickFormat(() => "") // Hide the numbers for the grid lines
                )
                .selectAll("line")
                .attr("stroke", "#e0e0e0")

            // 6. Add Y Grid Lines
            g.append("g")
                .attr("class", "grid")
                .call(d3Instance.axisLeft(y)
                    .ticks(8)
                    .tickSize(-width) // This extends the line RIGHTWARDS
                    .tickFormat(() => "") // Hide the numbers for the grid lines
                )
                .selectAll("line")
                .attr("stroke", "#e0e0e0")
                .attr("stroke-dasharray", "4,4");

            // 7. Remove the outer domain paths for a cleaner look
            g.selectAll(".grid path").style("stroke-width", 0);

            // 8. Draw your actual visible axes (the ones with numbers) AFTER the grid
            // so the numbers sit on top of the grid lines
            const xAxis = g.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3Instance.axisBottom(x).ticks(8).tickSize(0).tickFormat(() => ""));

            const yAxis = g.append("g")
                .call(d3Instance.axisLeft(y).ticks(8).tickFormat(d3Instance.format("$.2s")));

            // Style the visible axes
            [yAxis].forEach(axis => {
                axis.selectAll("text").style("font-family", "fw-600").style("fill", "#000");
                axis.select(".domain").attr("stroke", "#ccc"); // The main axis line
            });

            const labelStyle = {
                font: 'fw-600',
                size: '8px',
                color: '#333',
                Yoffset: 3,
                Xoffset: 10
            };

            g.append('text')
                .attr('x', width - labelStyle.Xoffset)
                .attr('y', y(metrics.fixedcosts) - labelStyle.Yoffset)
                .attr('text-anchor', 'end')
                .text('FIXED COST')
                .style('font-family', labelStyle.font)
                .style('font-size', labelStyle.size)
                .style('fill', '#777777');

            const totalExpenseAtEnd = metrics.fixedcosts + (zoom * metrics.variable_expense);

            g.append('text')
                .attr('x', width - labelStyle.Xoffset)
                .attr('y', y(totalExpenseAtEnd) - labelStyle.Yoffset)
                .attr('text-anchor', 'end')
                .text('TOTAL COST')
                .style('font-family', labelStyle.font)
                .style('font-size', labelStyle.size)
                .style('fill', '#dd392c');

            g.append('text')
                .attr('x', width - labelStyle.Xoffset)
                .attr('y', y(zoom) - labelStyle.Yoffset)
                .attr('text-anchor', 'end')
                .text('REVENUE')
                .style('font-family', labelStyle.font)
                .style('font-size', labelStyle.size)
                .style('fill', '#9ebd66');

        }, payload);

        // Explicitly wait for the SVG to be created before we take the picture
        await page.waitForSelector('#chart svg');
    }
}