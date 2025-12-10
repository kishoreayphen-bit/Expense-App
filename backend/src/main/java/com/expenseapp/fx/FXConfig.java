package com.expenseapp.fx;

import com.expenseapp.fx.provider.FXProviderClient;
import com.expenseapp.fx.provider.OpenExchangeRatesClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

@Configuration
@EnableScheduling
public class FXConfig {

    @Bean
    @ConditionalOnProperty(name = "fx.provider", havingValue = "openexchangerates")
    public FXProviderClient fxProviderClient(
            @Value("${openexchangerates.appId}") String oxrAppId
    ) {
        return new OpenExchangeRatesClient(oxrAppId);
    }
}
