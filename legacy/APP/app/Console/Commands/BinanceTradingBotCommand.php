<?php

namespace App\Console\Commands;

use ccxt\binance;
use Illuminate\Console\Command;

class BinanceTradingBotCommand extends Command
{
    protected $signature = 'trading:bot';
    protected $description = 'Automated Trading Bot for Binance';

    protected $apiKey = 'hJFavh0LavyXQOBfVUiW3WYh0PXbQp0aCO9WWrZSo7j2qywO8w0YCxk882z8INhd';
    protected $apiSecret = 'fJNOJDuNyiaITuJw1onsEgJRWvkR6ku1KFkGzyUFr533ZcwFpV6fKqHZ7HzGueCV';
    protected $symbol = 'KAITO/USDT';
    protected $balance = 50;
    protected $leverage = 5;
    protected $tpPercent = 20;
    protected $slPercent = 10;
    protected $position = null;
    protected $entryPrice = null;
    protected $binance;

    public function __construct()
    {
        parent::__construct();
        $this->binance = new binance([
            'apiKey' => $this->apiKey,
            'secret' => $this->apiSecret,
            'options' => ['defaultType' => 'future'],
        ]);
    }

    public function handle()
    {
        $i = 1;
        while (true) {
            $prices = $this->getPrices('1h', 30); // Get last 30 hourly prices

            $pricesMa = $this->getPrices('15m', 30);

            $ma24 = $this->calculateMA($prices, 24); // Calculate MA24 (24-period moving average)
            $ma15 = $this->calculateMA($pricesMa, 15); // Calculate MA15 (15-period moving average)

            $currentPrice = end($prices);
            $trend = $this->defineTrend($currentPrice, $ma24); // Define trend based on MA24

            $this->info("Cycle: $i | Trend: $trend | Current Price: $currentPrice | MA24: $ma24 | MA15: $ma15");
            $i++;

            if ($trend) {
                $this->info($this->shouldTrade($currentPrice, $ma15, $trend) ? 'Ready to trade' : 'Do not trade');

                if ($this->shouldTrade($currentPrice, $ma15, $trend)) {
                    $this->openTrade($trend, $currentPrice, $ma15);
                }
            }

            $this->checkTradeExit($currentPrice);
//            sleep(60); // Wait for 1 minute before checking again
        }
    }

    private function getPrices($timeframe = '1h', $limit = 50)
    {
        // Fetch last 'limit' number of OHLCV data (1-hour candles in this case)
        $ohlcv = $this->binance->fetch_ohlcv($this->symbol, $timeframe, null, $limit);
        return array_column($ohlcv, 4); // Return the closing prices
    }

    private function calculateMA($prices, $period = 24)
    {
        // Calculate Moving Average (MA) for the given period
        return array_sum(array_slice($prices, -$period)) / $period;
    }

    private function defineTrend($currentPrice, $ma24)
    {
        // Define trend based on MA24
        if ($currentPrice > $ma24) {
            return "uptrend"; // Uptrend if price is above MA24
        } elseif ($currentPrice < $ma24) {
            return "downtrend"; // Downtrend if price is below MA24
        }
        return null; // No clear trend if price equals MA24
    }

    private function shouldTrade($currentPrice, $ma15, $trend)
    {

        // Decide whether to trade based on the price crossing MA15
        if ($trend === "uptrend" && $currentPrice <= $ma15) {
            return true; // Buy long if uptrend and price touches or goes below MA15
        } elseif ($trend === "downtrend" && $currentPrice >= $ma15) {
            return true; // Sell short if downtrend and price touches or goes above MA15
        }
        return false; // No trade if conditions are not met
    }

    private function openTrade($trend, $currentPrice, $ma15)
    {
        // Open trade if the conditions are met
        if ($this->position === null) {
            $quantity = round(($this->balance * $this->leverage) / $currentPrice, 3); // Calculate quantity based on budget and leverage

            if ($trend === "uptrend" && $currentPrice <= $ma15) {
                // Open long position if in uptrend and price is at or below MA15
                $this->info("Opening long position at $currentPrice");
                $this->binance->create_market_buy_order($this->symbol, $quantity);
                $this->position = "long";
                $this->entryPrice = $currentPrice;
                $this->info("Long position opened at $currentPrice, Quantity: $quantity");
            } elseif ($trend === "downtrend" && $currentPrice >= $ma15) {
                // Open short position if in downtrend and price is at or above MA15
                $this->info("Opening short position at $currentPrice");
                $this->binance->create_market_sell_order($this->symbol, $quantity);
                $this->position = "short";
                $this->entryPrice = $currentPrice;
                $this->info("Short position opened at $currentPrice, Quantity: $quantity");
            }
        }
    }

    private function checkTradeExit($currentPrice)
    {
        // Check if the position should be closed based on TP/SL conditions
        if ($this->position === null) return;

        $priceChange = (($currentPrice - $this->entryPrice) / $this->entryPrice) * 100 * $this->leverage;

        // Take profit after 30% win
        if ($priceChange >= $this->tpPercent) {
            $side = $this->position === "long" ? "sell" : "buy";
            $quantity = ($this->balance * $this->leverage) / $this->entryPrice;

            $this->binance->create_market_order($this->symbol, $side, $quantity);
            $this->info("Closed $this->position position at $currentPrice due to TP (Take Profit)");
            $this->position = null;
        }

        // Stop loss after 15% loss
        if ($priceChange <= -$this->slPercent) {
            $side = $this->position === "long" ? "sell" : "buy";
            $quantity = ($this->balance * $this->leverage) / $this->entryPrice;

            $this->binance->create_market_order($this->symbol, $side, $quantity);
            $this->info("Closed $this->position position at $currentPrice due to SL (Stop Loss)");
            $this->position = null;
        }
    }
}

