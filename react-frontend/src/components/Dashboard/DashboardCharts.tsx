import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  useTheme
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface DashboardChartsProps {
  className?: string;
}

type ChartType = 'class' | 'income' | 'distribution' | 'growth' | 'breakdown' | 'timeline';

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ className }) => {
  const [activeChart, setActiveChart] = useState<ChartType>('income');
  const theme = useTheme();

  // Mock data generators for each chart type
  const getChartData = (type: ChartType) => {
    switch (type) {
      case 'class':
        return [
          { name: 'Class A', return: 12.5, investment: 15000 },
          { name: 'Class B', return: 8.3, investment: 25000 },
          { name: 'Class C', return: 6.7, investment: 10000 }
        ];

      case 'income':
        return [
          { month: 'Jan', income: 245 },
          { month: 'Feb', income: 280 },
          { month: 'Mar', income: 320 },
          { month: 'Apr', income: 385 },
          { month: 'May', income: 425 },
          { month: 'Jun', income: 480 }
        ];

      case 'distribution':
        return [
          { property: 'Property 1', amount: 5000 },
          { property: 'Property 2', amount: 10000 },
          { property: 'Property 3', amount: 7500 },
          { property: 'Property 4', amount: 12000 },
          { property: 'Property 5', amount: 8500 }
        ];

      case 'growth':
        return [
          { property: 'Property 1', purchase: 5000, current: 5500 },
          { property: 'Property 2', purchase: 10000, current: 11200 },
          { property: 'Property 3', purchase: 7500, current: 8100 },
          { property: 'Property 4', purchase: 12000, current: 13800 },
          { property: 'Property 5', purchase: 8500, current: 9200 }
        ];

      case 'breakdown':
        return [
          { property: 'Property 1', rental: 85, appreciation: 125 },
          { property: 'Property 2', rental: 180, appreciation: 300 },
          { property: 'Property 3', rental: 120, appreciation: 150 },
          { property: 'Property 4', rental: 220, appreciation: 450 },
          { property: 'Property 5', rental: 140, appreciation: 175 }
        ];

      case 'timeline':
        return [
          { quarter: 'Q1 2024', value: 25000 },
          { quarter: 'Q2 2024', value: 28500 },
          { quarter: 'Q3 2024', value: 32000 },
          { quarter: 'Q4 2024', value: 35500 },
          { quarter: 'Q1 2025', value: 39200 },
          { quarter: 'Q2 2025', value: 43000 }
        ];

      default:
        return [];
    }
  };

  const getChartConfig = (type: ChartType) => {
    const primaryColor = theme.palette.primary.main;
    const successColor = theme.palette.success.main;
    const warningColor = theme.palette.warning.main;

    switch (type) {
      case 'class':
        return {
          title: 'Portfolio Performance by Property Class',
          description: 'Return percentage by property class in your portfolio',
          bars: [
            { dataKey: 'return', fill: primaryColor, name: 'Return %' }
          ]
        };

      case 'income':
        return {
          title: 'Monthly Rental Income Progression',
          description: 'Your rental income growth over the last 6 months',
          bars: [
            { dataKey: 'income', fill: successColor, name: 'Monthly Income ($)' }
          ]
        };

      case 'distribution':
        return {
          title: 'Investment Distribution by Property',
          description: 'How your capital is allocated across different properties',
          bars: [
            { dataKey: 'amount', fill: primaryColor, name: 'Investment ($)' }
          ]
        };

      case 'growth':
        return {
          title: 'Property Value Growth',
          description: 'Purchase price vs current value for each property',
          bars: [
            { dataKey: 'purchase', fill: theme.palette.grey[400], name: 'Purchase Price' },
            { dataKey: 'current', fill: successColor, name: 'Current Value' }
          ]
        };

      case 'breakdown':
        return {
          title: 'Income vs Appreciation Returns',
          description: 'Rental income vs appreciation gains by property',
          bars: [
            { dataKey: 'rental', fill: primaryColor, name: 'Rental Income ($)' },
            { dataKey: 'appreciation', fill: warningColor, name: 'Appreciation ($)' }
          ]
        };

      case 'timeline':
        return {
          title: 'Portfolio Value Timeline',
          description: 'Total portfolio value growth over time',
          bars: [
            { dataKey: 'value', fill: primaryColor, name: 'Portfolio Value ($)' }
          ]
        };

      default:
        return {
          title: 'Chart',
          description: '',
          bars: []
        };
    }
  };

  const chartData = getChartData(activeChart);
  const chartConfig = getChartConfig(activeChart);

  const tabs = [
    { value: 'income' as ChartType, label: 'Monthly Income' },
    { value: 'class' as ChartType, label: 'By Class' },
    { value: 'distribution' as ChartType, label: 'Distribution' },
    { value: 'growth' as ChartType, label: 'Growth' },
    { value: 'breakdown' as ChartType, label: 'Income vs Growth' },
    { value: 'timeline' as ChartType, label: 'Timeline' }
  ];

  return (
    <Card className={className}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Portfolio Analytics
        </Typography>

        {/* Tab Navigation */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={activeChart}
            onChange={(_, newValue) => setActiveChart(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                minHeight: 48,
                textTransform: 'none',
                fontSize: '0.875rem',
                fontWeight: 500
              }
            }}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.value}
                label={tab.label}
                value={tab.value}
              />
            ))}
          </Tabs>
        </Box>

        {/* Chart Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {chartConfig.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {chartConfig.description}
          </Typography>
        </Box>

        {/* Chart Container */}
        <Box sx={{ width: '100%', height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis 
                dataKey={activeChart === 'income' ? 'month' : 
                         activeChart === 'class' ? 'name' :
                         activeChart === 'distribution' ? 'property' :
                         activeChart === 'growth' ? 'property' :
                         activeChart === 'breakdown' ? 'property' :
                         'quarter'}
                stroke={theme.palette.text.secondary}
                fontSize={12}
              />
              <YAxis stroke={theme.palette.text.secondary} fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: theme.shape.borderRadius,
                  boxShadow: theme.shadows[3]
                }}
              />
              <Legend />
              {chartConfig.bars.map((bar, index) => (
                <Bar
                  key={index}
                  dataKey={bar.dataKey}
                  fill={bar.fill}
                  name={bar.name}
                  radius={[2, 2, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Box>

        {/* Chart Footer */}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          💡 Click tabs above to view different portfolio analytics
        </Typography>
      </CardContent>
    </Card>
  );
};