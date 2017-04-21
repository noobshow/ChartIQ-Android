package com.chartiq.chartiqsample;

import android.os.AsyncTask;
import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.text.TextUtils;
import android.util.Log;

import com.chartiq.sdk.ChartIQ;
import com.chartiq.sdk.model.OHLCChart;
import com.google.gson.Gson;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Map;
import java.util.TimeZone;
public class MainActivity extends AppCompatActivity {

    String MobiAPIKey = "JGPHS0Pk6St63QUBdHk5uVZDM11T2Z1d1/BFz9E8HyI=";
    public static String chartUrl = "file:///android_asset/template-native-sdk.html";


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chart);


        // attach ChartIQ object to the view
        final ChartIQ chartIQview = (ChartIQ) findViewById(R.id.webview);

        chartIQview.setDataSource(new ChartIQ.DataSource() {
            @Override
            public void pullInitialData(Map<String, Object> params, ChartIQ.DataSourceCallback callback) {
                Log.e("setDataSource","Start ");
                loadChartData(params, callback);
            }

            @Override
            public void pullUpdateData(Map<String, Object> params, ChartIQ.DataSourceCallback callback) {
                Log.e("setDataSource","Start update");
                loadChartData(params, callback);
            }

            @Override
            public void pullPaginationData(Map<String, Object> params, ChartIQ.DataSourceCallback callback) {
                Log.e("setDataSource","Start pullPaginationData");
                loadChartData(params, callback);
            }
        });



        // init ChartIQ SDK, pass in Mobi API key and library path
        chartIQview.start(MobiAPIKey, chartUrl, new ChartIQ.CallbackStart() {
            @Override
            public void onStart() {
                Log.e("MainActivity","Start Successful");
                chartIQview.setDataMethod(ChartIQ.DataMethod.PULL,"RELIANCE.XNSE");
                chartIQview.setSymbol("RELIANCE.XNSE");
            }
        });
        chartIQview.enableCrosshairs();
    }

    private void loadChartData(Map<String, Object> params, final ChartIQ.DataSourceCallback callback) {
        if(!params.containsKey("start") || params.get("start") == null || "".equals(params.get("start"))) {
            params.put("start", "2016-12-16T16:00:00.000Z");
        }

        if(params.containsKey("end") || "".equals(params.get("start"))) {
            TimeZone tz = TimeZone.getTimeZone("UTC");
            DateFormat df = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm'Z'");
            df.setTimeZone(tz);
            String endDate = df.format(new Date());
            params.put("end", endDate);
        }

        boolean isMinute = params.containsKey("interval") && TextUtils.isDigitsOnly(String.valueOf(params.get("interval")));
        params.put("interval", isMinute ? "minute" : params.get("interval"));
        params.put("period", isMinute ? 1 : params.get("period"));

        StringBuilder builder = new StringBuilder();
        builder.append("http://simulator.chartiq.com/datafeed?");
        builder.append("identifier=" + params.get("symbol"));
        builder.append("&startdate=" + params.get("start"));
        if (params.containsKey("end")) {
            builder.append("&enddate=" + params.get("end"));
        }
        builder.append("&interval=" + params.get("interval"));
        builder.append("&period=" + params.get("period"));
        builder.append("&seed=1001");

        Log.e("Url",builder.toString());

        final String url = builder.toString();
        new AsyncTask<Void, Void, String>() {
            @Override
            protected String doInBackground(Void... params) {
                String body = "";
                try {
                    URL connectionUrl = new URL(url);
                    HttpURLConnection connection = (HttpURLConnection) connectionUrl.openConnection();
                    connection.setRequestMethod("GET");
                    connection.setRequestProperty("Content-Type", "application/json");
                    connection.connect();
                    int code = connection.getResponseCode();

                    InputStream is;
                    StringBuilder builder;
                    if (code >= 200 && code < 400) {
                        builder = new StringBuilder();
                        is = connection.getInputStream();
                    } else {
                        is = connection.getErrorStream();
                        builder = new StringBuilder("Error("+code+"): ");
                    }
                    if (is != null) {
                        BufferedReader reader = new BufferedReader(new InputStreamReader(is));
                        String line;
                        while ((line = reader.readLine()) != null) {
                            builder.append(line);
                        }
                        body = builder.toString();
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
                return body;
            }

            @Override
            protected void onPostExecute(String body) {
                Log.e("Body",body);
                if(!body.startsWith("Error") && !"invalid symbol".equals(body)){
                    OHLCChart[] data = new Gson().fromJson(body, OHLCChart[].class);
                    callback.execute(data);
                }
            }
        }.execute((Void[]) null);
    }
}