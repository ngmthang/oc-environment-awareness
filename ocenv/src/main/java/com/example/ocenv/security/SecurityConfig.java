// SecurityConfig.java (unchanged except comment cleanup; your current one already works)
package com.example.ocenv.security;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.ignoringRequestMatchers("/visitor/register", "/api/**"))

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/", "/index.html", "/login.html").permitAll()
                        .requestMatchers("/visitor/register").permitAll()
                        .requestMatchers("/css/**", "/js/**", "/images/**", "/favicon.ico").permitAll()
                        .requestMatchers("/main.html").permitAll()
                        .anyRequest().permitAll()
                )

                .logout(logout -> logout
                        .logoutUrl("/logout")
                        .logoutSuccessUrl("/login.html")
                        .invalidateHttpSession(true)
                        .deleteCookies("JSESSIONID")
                        .permitAll()
                )

                .addFilterBefore(visitorSessionGateFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public OncePerRequestFilter visitorSessionGateFilter() {
        return new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(
                    HttpServletRequest request,
                    HttpServletResponse response,
                    FilterChain filterChain
            ) throws ServletException, IOException {

                String path = request.getRequestURI();
                if (!"/main.html".equals(path)) {
                    filterChain.doFilter(request, response);
                    return;
                }

                HttpSession session = request.getSession(false);
                Object visitorId = (session == null) ? null : session.getAttribute("visitorId");

                if (visitorId == null) {
                    response.sendRedirect("/login.html");
                    return;
                }

                filterChain.doFilter(request, response);
            }
        };
    }
}